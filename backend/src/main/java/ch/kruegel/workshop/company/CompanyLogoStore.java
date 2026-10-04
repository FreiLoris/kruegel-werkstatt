package ch.kruegel.workshop.company;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;

/**
 * The logo in the company profile row – plain SQL, so the bytes are only loaded when the image
 * itself is requested.
 */
@Repository
class CompanyLogoStore {

    /** The image with its type and when it was uploaded (for the cache-busting URL). */
    record Logo(byte[] data, String contentType, Instant updatedAt) {
    }

    /** Type and time only – for the DTO, without the bytes. */
    record LogoInfo(String contentType, Instant updatedAt) {
    }

    static final int MAX_BYTES = 1024 * 1024;

    private final JdbcClient jdbc;

    CompanyLogoStore(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    Optional<Logo> load() {
        return jdbc.sql("SELECT logo, logo_content_type, logo_updated_at FROM company_profile WHERE logo IS NOT NULL")
                .query((rs, row) -> new Logo(rs.getBytes(1), rs.getString(2), rs.getTimestamp(3).toInstant()))
                .optional();
    }

    Optional<LogoInfo> info() {
        return jdbc.sql("SELECT logo_content_type, logo_updated_at FROM company_profile WHERE logo IS NOT NULL")
                .query((rs, row) -> new LogoInfo(rs.getString(1), rs.getTimestamp(2).toInstant()))
                .optional();
    }

    void save(byte[] data, String contentType, Instant now) {
        jdbc.sql("UPDATE company_profile SET logo = :data, logo_content_type = :type, logo_updated_at = :now")
                .param("data", data)
                .param("type", contentType)
                .param("now", Timestamp.from(now))
                .update();
    }

    void delete() {
        jdbc.sql("UPDATE company_profile SET logo = NULL, logo_content_type = NULL, logo_updated_at = NULL").update();
    }

    /**
     * Image type from the file CONTENT (not the name, not what the browser claims).
     *
     * @return the media type, or {@code null} if it is none of PNG, JPEG, WebP, SVG
     */
    static String detectType(byte[] data) {
        if (startsWith(data, 0, (byte) 0x89, (byte) 'P', (byte) 'N', (byte) 'G')) {
            return "image/png";
        }
        if (startsWith(data, 0, (byte) 0xFF, (byte) 0xD8, (byte) 0xFF)) {
            return "image/jpeg";
        }
        if (startsWith(data, 0, (byte) 'R', (byte) 'I', (byte) 'F', (byte) 'F')
                && startsWith(data, 8, (byte) 'W', (byte) 'E', (byte) 'B', (byte) 'P')) {
            return "image/webp";
        }
        String head = new String(data, 0, Math.min(data.length, 2048), StandardCharsets.UTF_8).stripLeading();
        if ((head.startsWith("<?xml") || head.startsWith("<svg") || head.startsWith("<!--")) && head.contains("<svg")) {
            return "image/svg+xml";
        }
        return null;
    }

    private static boolean startsWith(byte[] data, int offset, byte... prefix) {
        if (data.length < offset + prefix.length) {
            return false;
        }
        for (int i = 0; i < prefix.length; i++) {
            if (data[offset + i] != prefix[i]) {
                return false;
            }
        }
        return true;
    }
}
