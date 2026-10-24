import {
  Cake,
  CalendarCheck,
  CalendarDays,
  Car,
  CircleCheck,
  ClipboardList,
  Contact,
  Disc3,
  Gauge,
  Hourglass,
  KeyRound,
  ListTodo,
  Mail,
  Package,
  RotateCcw,
  Route,
  Ruler,
  ShoppingCart,
  Smartphone,
  Sparkles,
  StickyNote,
  Timer,
  Truck,
  UserPlus,
  Users,
  Warehouse,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { reasonOf } from '../../api/errors'
import { Button } from '../../components/ui/Button'
import { daysBetween, WEEKDAYS, WEEKDAYS_SHORT } from '../../lib/calendar'
import { formatCount, formatDate, formatDecimal, formatDuration, formatMonthName, formatPercent, formatQuantity } from '../../lib/format'
import { ABSENCE_CATEGORY } from '../absences/absenceApi'
import { SHOPPING_STATUS } from '../shopping/shoppingApi'
import { CATEGORY_LABEL } from '../stock/stockApi'
import { TASK_STATUS } from '../tasks/taskApi'
import { EVENT_TEXT, KINDS, SEASONS, SET_STATES } from '../tire-hotel/tireHotelApi'
import { BarList, Card, ColumnChart, ShareBar, StatTile, type Bar } from './Charts'
import { funFacts, tiresInHotel, vehicleName } from './funFacts'
import styles from './Statistics.module.css'
import { useStatistics, type Count, type Statistics } from './statisticsApi'

type SectionId = 'fun' | 'tasks' | 'vehicles' | 'customers' | 'tires' | 'team' | 'material'

/** In the order of the page – the jump bar at the top follows it */
const SECTIONS: Record<SectionId, { title: string; icon: LucideIcon }> = {
  fun: { title: 'Schon gewusst?', icon: Sparkles },
  tasks: { title: 'Aufträge', icon: ClipboardList },
  vehicles: { title: 'Fahrzeuge', icon: Car },
  customers: { title: 'Kunden', icon: Users },
  tires: { title: 'Pneuhotel', icon: Disc3 },
  team: { title: 'Team', icon: Contact },
  material: { title: 'Material', icon: Package },
}

const STATUS_COLOR: Record<string, string> = {
  RECEIVED: 'var(--color-status-received)',
  IN_PROGRESS: 'var(--color-status-in-progress)',
  WAITING_FOR_PARTS: 'var(--color-status-waiting)',
  DONE: 'var(--color-status-done)',
}

const SEASON_COLOR: Record<string, string> = {
  SUMMER: 'var(--color-warning)',
  WINTER: 'var(--color-info)',
  ALL_SEASON: 'var(--color-success)',
}

const SOURCE_LABEL: Record<string, string> = { SWISSGARAGE: 'SwissGarage', LOCAL: 'Laufkundschaft (nur in der App)' }

/** Fixed values (status, season …) in words – an unknown one as it comes */
function labelled(rows: Count[], labels: Record<string, string>, colors?: Record<string, string>): Bar[] {
  return rows.map((row) => ({ label: labels[row.label] ?? row.label, count: row.count, color: colors?.[row.label] }))
}

/** "zu bestellen" stands in a sentence elsewhere – alone in the legend it starts with a capital */
function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * The statistics page (15a): informative numbers and fun facts about the whole workshop – a big
 * number first, then the charts. Everything counted by the server on each visit.
 */
export function StatisticsPage() {
  const { data, error, refetch } = useStatistics()

  return (
    <>
      <h1>Statistik</h1>
      <p className={`muted ${styles.intro}`}>
        Zahlen, Rekorde und Kurioses aus der Werkstatt{data ? ` – Stand ${formatDate(data.today)}` : ''}
      </p>
      {error && !data ? (
        <div role="alert">
          <p>Die Statistik konnte nicht geladen werden. {reasonOf(error)}</p>
          <Button icon={RotateCcw} onClick={() => void refetch()}>
            Nochmals versuchen
          </Button>
        </div>
      ) : !data ? (
        <p className="muted" role="status">
          Zählt …
        </p>
      ) : (
        <StatisticsContent stats={data} />
      )}
    </>
  )
}

function StatisticsContent({ stats }: { stats: Statistics }) {
  const facts = funFacts(stats)
  return (
    <>
      <nav className={styles.jump} aria-label="Bereiche">
        {(Object.keys(SECTIONS) as SectionId[])
          .filter((id) => id !== 'fun' || facts.length > 0)
          .map((id) => {
            const { title, icon: Icon } = SECTIONS[id]
            return (
              <a key={id} href={`#${id}`}>
                <Icon aria-hidden />
                {title}
              </a>
            )
          })}
      </nav>
      {facts.length > 0 && (
        <Section id="fun">
          <ul className={styles.facts}>
            {facts.map((fact) => (
              <li key={fact.topic} className={styles.fact}>
                <span className={styles.factTopic}>{fact.topic}</span>
                <p>{fact.text}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}
      <Tasks stats={stats} />
      <Vehicles stats={stats} />
      <Customers stats={stats} />
      <Tires stats={stats} />
      <Team stats={stats} />
      <Material stats={stats} />
    </>
  )
}

function Section({ id, children }: { id: SectionId; children: ReactNode }) {
  const { title, icon: Icon } = SECTIONS[id]
  return (
    <section id={id} className={styles.section} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className={styles.sectionTitle}>
        <Icon aria-hidden />
        {title}
      </h2>
      {children}
    </section>
  )
}

function Tasks({ stats }: { stats: Statistics }) {
  const { tasks } = stats
  const share = (count: number) => `${formatPercent(count, tasks.total)} aller Aufträge`
  return (
    <Section id="tasks">
      <div className={styles.tiles}>
        <StatTile
          icon={ClipboardList}
          value={formatCount(tasks.total)}
          label="Aufträge total"
          hint={tasks.firstAppointment ? `seit ${formatDate(tasks.firstAppointment)}` : undefined}
        />
        <StatTile icon={CalendarDays} value={formatCount(tasks.thisYear)} label="Dieses Jahr" hint="inkl. geplante" />
        <StatTile icon={CalendarCheck} value={formatCount(tasks.thisMonth)} label="Diesen Monat" hint="inkl. geplante" />
        <StatTile icon={CircleCheck} value={formatCount(tasks.done)} label="Fertig" hint={share(tasks.done)} />
        <StatTile icon={Hourglass} value={formatCount(tasks.waitingCustomer)} label="Kunde wartet" hint={share(tasks.waitingCustomer)} />
        <StatTile icon={Disc3} value={formatCount(tasks.tireChange)} label="Mit Pneuwechsel" hint={share(tasks.tireChange)} />
        <StatTile icon={Route} value={formatCount(tasks.mfk)} label="Mit MFK" hint={share(tasks.mfk)} />
        {tasks.averageMinutes != null && (
          <StatTile icon={Timer} value={formatDuration(tasks.averageMinutes)} label="Ø auf dem Lift" hint="pro Termin, wie geplant" />
        )}
      </div>
      <div className={styles.cards}>
        <Card title="Aufträge pro Monat" wide>
          <ColumnChart
            unit={['Auftrag', 'Aufträge']}
            columns={tasks.perMonth.map((month) => ({ label: formatMonthName(month.label), title: formatMonthName(month.label, true), count: month.count }))}
          />
        </Card>
        <Card title="Nach Wochentag">
          <ColumnChart
            unit={['Termin', 'Termine']}
            columns={tasks.perWeekday.map((count, day) => ({ label: WEEKDAYS_SHORT[day], title: WEEKDAYS[day], count }))}
          />
        </Card>
        <Card title="Nach Uhrzeit (Start)">
          <ColumnChart unit={['Termin', 'Termine']} columns={tasks.perHour.map((hour) => ({ label: hour.label, title: `${hour.label} Uhr`, count: hour.count }))} />
        </Card>
        <Card title="Status">
          <ShareBar parts={labelled(tasks.byStatus, TASK_STATUS, STATUS_COLOR)} />
        </Card>
        <Card title="Beliebteste Arbeiten">
          <BarList rows={tasks.serviceItems} />
        </Card>
        <Card title="Aufträge pro Lift">
          <BarList rows={tasks.lifts} />
        </Card>
        <Card title="Aufträge pro Mechaniker">
          <BarList rows={tasks.mechanics} />
        </Card>
        <Card title="Angenommen von">
          <BarList rows={tasks.acceptedBy} />
        </Card>
        <Card title="Stammkunden">
          <BarList rows={tasks.regulars} empty="Noch niemand mit mehr als einem Auftrag" />
        </Card>
      </div>
    </Section>
  )
}

function Vehicles({ stats }: { stats: Statistics }) {
  const { vehicles } = stats
  return (
    <Section id="vehicles">
      <div className={styles.tiles}>
        <StatTile icon={Car} value={formatCount(vehicles.total)} label="Fahrzeuge" />
        {vehicles.averageAgeYears != null && (
          <StatTile icon={CalendarDays} value={formatQuantity(vehicles.averageAgeYears, 'Jahr', 'Jahre')} label="Ø Alter" hint="ab 1. Inverkehrsetzung" />
        )}
        <StatTile
          icon={Gauge}
          value={`${formatCount(vehicles.totalKm)} km`}
          label="Kilometer zusammen"
          hint={vehicles.withMileage > 0 ? `Ø ${formatCount(vehicles.totalKm / vehicles.withMileage)} km pro Fahrzeug` : undefined}
        />
        {vehicles.oldest?.year != null && (
          <StatTile icon={Wrench} value={String(vehicles.oldest.year)} label="Ältestes Fahrzeug" hint={vehicleName(vehicles.oldest)} />
        )}
        {!!vehicles.mostKm?.mileageKm && (
          <StatTile icon={Route} value={`${formatCount(vehicles.mostKm.mileageKm)} km`} label="Kilometer-König" hint={vehicleName(vehicles.mostKm)} />
        )}
      </div>
      <div className={styles.cards}>
        <Card title="Top-Marken">
          <BarList rows={vehicles.makes} />
        </Card>
        <Card title="Top-Modelle">
          <BarList rows={vehicles.models} />
        </Card>
        <Card title="Farben">
          <BarList rows={vehicles.colors} />
        </Card>
        <Card title="Treibstoff">
          <ShareBar parts={vehicles.fuels} />
        </Card>
        <Card title="Kantone (Kennzeichen)">
          <BarList rows={vehicles.cantons} />
        </Card>
      </div>
    </Section>
  )
}

function Customers({ stats }: { stats: Statistics }) {
  const { customers } = stats
  const share = (count: number) => `${formatPercent(count, customers.total)} der Kunden`
  return (
    <Section id="customers">
      <div className={styles.tiles}>
        <StatTile icon={Users} value={formatCount(customers.total)} label="Kunden" />
        <StatTile icon={Contact} value={formatCount(customers.companies)} label="Firmen" hint={share(customers.companies)} />
        <StatTile icon={UserPlus} value={formatCount(customers.newThisYear)} label="Neu dieses Jahr" hint="inkl. SwissGarage-Import" />
        <StatTile icon={Mail} value={formatCount(customers.withEmail)} label="Mit E-Mail" hint={share(customers.withEmail)} />
        <StatTile icon={Smartphone} value={formatCount(customers.withMobile)} label="Mit Handy" hint={share(customers.withMobile)} />
      </div>
      <div className={styles.cards}>
        <Card title="Häufigste Orte">
          <BarList rows={customers.cities} />
        </Card>
        <Card title="Häufigste Vornamen">
          <BarList rows={customers.firstNames} />
        </Card>
        <Card title="Herkunft der Daten">
          <ShareBar parts={labelled(customers.sources, SOURCE_LABEL)} />
        </Card>
      </div>
    </Section>
  )
}

function Tires({ stats }: { stats: Statistics }) {
  const { tires } = stats
  const inHotel = tiresInHotel(stats)
  return (
    <Section id="tires">
      <div className={styles.tiles}>
        <StatTile icon={Disc3} value={formatCount(tires.sets)} label="Sätze erfasst" />
        <StatTile icon={Warehouse} value={formatCount(inHotel)} label="Im Pneuhotel" hint={`${formatCount(inHotel * 4)} Reifen`} />
        {tires.averageDepthMm != null && (
          <StatTile icon={Ruler} value={`${formatDecimal(tires.averageDepthMm)} mm`} label="Ø Profil" hint="der eingelagerten Sätze" />
        )}
        {tires.oldestYear != null && <StatTile icon={CalendarDays} value={String(tires.oldestYear)} label="Ältester Satz" hint="Jahrgang, im Pneuhotel" />}
      </div>
      <div className={styles.cards}>
        <Card title="Wo die Sätze sind">
          <ShareBar parts={labelled(tires.states, SET_STATES)} />
        </Card>
        <Card title="Saison (im Pneuhotel)">
          <ShareBar parts={labelled(tires.seasons, SEASONS, SEASON_COLOR)} />
        </Card>
        <Card title="Räder oder Reifen">
          <ShareBar parts={labelled(tires.kinds, KINDS)} />
        </Card>
        <Card title="Reifenmarken">
          <BarList rows={tires.brands} />
        </Card>
        <Card title="Dimensionen">
          <BarList rows={tires.dimensions} />
        </Card>
        <Card title="Dieses Jahr passiert">
          <BarList rows={labelled(tires.eventsThisYear, EVENT_TEXT)} />
        </Card>
      </div>
    </Section>
  )
}

function Team({ stats }: { stats: Statistics }) {
  const { team, today } = stats
  const birthday = team.nextBirthday
  const inDays = birthday ? daysBetween(today, birthday.date) : 0
  const year = today.slice(0, 4)
  return (
    <Section id="team">
      <div className={styles.tiles}>
        <StatTile icon={Users} value={formatCount(team.employees)} label="Im Team" />
        {birthday && (
          <StatTile
            icon={Cake}
            value={birthday.name}
            label={inDays === 0 ? 'hat heute Geburtstag!' : `hat in ${formatQuantity(inDays, 'Tag', 'Tagen')} Geburtstag`}
            hint={`${formatDate(birthday.date)} · wird ${birthday.age}`}
          />
        )}
        <StatTile icon={ListTodo} value={formatCount(team.todosOpen)} label="To-dos offen" />
        <StatTile
          icon={CircleCheck}
          value={formatCount(team.todosDone)}
          label="To-dos erledigt"
          hint={team.todoChampion ? `am meisten: ${team.todoChampion.label}` : undefined}
        />
        <StatTile icon={StickyNote} value={formatCount(team.notes)} label="Notizen an der Pinnwand" />
      </div>
      <div className={styles.cards}>
        <Card title={`Abwesenheiten ${year} (ganzes Team)`}>
          <ShareBar
            format={(days) => formatQuantity(days, 'Tag', 'Tage')}
            parts={[
              { label: ABSENCE_CATEGORY.VACATION, count: team.vacationDays, color: 'var(--color-absence-vacation)' },
              { label: ABSENCE_CATEGORY.SICK, count: team.sickDays, color: 'var(--color-absence-sick)' },
              { label: ABSENCE_CATEGORY.TRAINING, count: team.trainingDays, color: 'var(--color-absence-training)' },
              { label: ABSENCE_CATEGORY.EXTERNAL_WORK, count: team.externalWorkDays, color: 'var(--color-absence-external)' },
            ]}
          />
        </Card>
      </div>
    </Section>
  )
}

function Material({ stats }: { stats: Statistics }) {
  const { material } = stats
  return (
    <Section id="material">
      <div className={styles.tiles}>
        <StatTile icon={ShoppingCart} value={formatCount(material.shoppingItems)} label="Einkaufspositionen" />
        {material.averageDeliveryDays != null && (
          <StatTile icon={Truck} value={formatQuantity(material.averageDeliveryDays, 'Tag', 'Tage')} label="Ø Lieferzeit" hint="von bestellt bis geliefert" />
        )}
        <StatTile icon={Warehouse} value={formatCount(material.stockItems)} label="Lagerartikel" hint={`${formatCount(material.stockQuantity)} Stück total`} />
        <StatTile
          icon={KeyRound}
          value={formatCount(material.courtesyBookings)}
          label="Ersatzwagen-Ausleihen"
          hint={material.courtesyDays > 0 ? `${formatQuantity(material.courtesyDays, 'Tag', 'Tage')} unterwegs` : undefined}
        />
      </div>
      <div className={styles.cards}>
        <Card title="Einkaufsliste">
          <ShareBar parts={labelled(material.shoppingStatus, SHOPPING_STATUS).map((part) => ({ ...part, label: capitalized(part.label) }))} />
        </Card>
        <Card title="Lieferanten">
          <BarList rows={material.suppliers} />
        </Card>
        <Card title="Lager nach Kategorie">
          <ShareBar parts={labelled(material.stockCategories, CATEGORY_LABEL)} />
        </Card>
        <Card title="Ersatzwagen">
          <BarList rows={material.courtesyCars} />
        </Card>
      </div>
    </Section>
  )
}
