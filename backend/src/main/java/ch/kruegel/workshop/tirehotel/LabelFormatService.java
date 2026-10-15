package ch.kruegel.workshop.tirehotel;

import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.common.web.NotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Label sheet formats (FB-07): the common ones come with the app, the workshop adds its own.
 * Deleted for real – nothing refers to them (the device remembers its last format).
 */
@Service
@Transactional
public class LabelFormatService {

    static final String TOPIC = "label-formats";

    private final LabelFormatRepository repository;
    private final ApplicationEventPublisher events;

    LabelFormatService(LabelFormatRepository repository, ApplicationEventPublisher events) {
        this.repository = repository;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public List<LabelFormatDto> list() {
        return repository.findAllInOrder().stream().map(LabelFormatDto::of).toList();
    }

    public LabelFormatDto create(LabelFormatRequest request) {
        LabelFormat.Layout layout = checked(request);
        if (repository.existsByNameIgnoreCase(layout.name())) {
            throw nameTaken(layout.name());
        }
        return saved(repository.save(new LabelFormat(layout, repository.maxSortOrder() + 1)));
    }

    public LabelFormatDto update(UUID id, LabelFormatRequest request) {
        if (request.version() == null) {
            throw new InvalidInputException("version", "muss beim Bearbeiten angegeben werden");
        }
        LabelFormat format = find(id);
        format.checkVersion(request.version());
        LabelFormat.Layout layout = checked(request);
        if (repository.existsByNameIgnoreCaseAndIdNot(layout.name(), id)) {
            throw nameTaken(layout.name());
        }
        format.update(layout);
        return saved(format);
    }

    public void delete(UUID id) {
        repository.delete(find(id));
        repository.flush();
        events.publishEvent(new DataChanged(TOPIC));
    }

    /** User-facing message, hence German */
    private static LabelFormat.Layout checked(LabelFormatRequest request) {
        LabelFormat.Layout layout = request.layout();
        if (!layout.fitsA4()) {
            throw new InvalidInputException("widthMm", "Die Etiketten gehen über den A4-Bogen hinaus – Masse prüfen");
        }
        return layout;
    }

    private LabelFormat find(UUID id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Etikettenformat", id));
    }

    private LabelFormatDto saved(LabelFormat format) {
        repository.flush();
        events.publishEvent(new DataChanged(TOPIC));
        return LabelFormatDto.of(format);
    }

    private static InvalidInputException nameTaken(String name) {
        return new InvalidInputException("name", "'" + name + "' gibt es bereits");
    }
}
