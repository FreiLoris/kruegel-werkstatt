import { pressureSummary, setSummary, sheetTires } from '../../tire-hotel/taskTires'
import type { TaskTires } from '../../tire-hotel/tireHotelApi'
import { formatDepth, WHEELS } from '../../tire-hotel/tread'
import { Block, Box, WriteIn } from './SheetParts'
import type { TiresBlock } from './sheetBlocks'
import styles from './TaskSheet.module.css'

/**
 * Tire change (FB-06, 13q), compact: one line per set – printed from the tire hotel, else to fill
 * in – with the storage place big, then ONE table with the tread depths of both sets: the set's
 * data are the same for all four wheels, only the depths differ. They go into the tire hotel when
 * the change is booked on the task. Below: what to mount the set with (FB-11) – printed when known,
 * else to fill in – and "Radschrauben beachten" as a warning (FB-17).
 *
 * @param tires from the tire hotel; missing = unknown, all to fill in
 */
export function TireBlock({ block, tires: hotel }: { block: TiresBlock; tires?: TaskTires }) {
  const what = block.wheels ? 'Räder' : 'Reifen'
  const tires = hotel && sheetTires(hotel, block.stored, !!block.newTires)
  const mount = tires?.mount
  const takeOff = tires?.takeOff
  const pressure = mount ? pressureSummary(mount) : ''

  return (
    <Block title="Radwechsel">
      <div className={styles.tireRow}>
        {block.newTires ? (
          <p className={styles.tireSet}>
            <strong>Neue Reifen montieren</strong> – {block.newTires.count}× {block.newTires.dimension ?? <WriteIn />}:{' '}
            {mount ? setSummary(mount) : <SetWriteIn wheels={false} withDimension={false} />}
          </p>
        ) : (
          <p className={styles.tireSet}>
            <strong>Montiert</strong> {block.stored ? `– ${what} aus dem Pneuhotel` : `– mitgebrachte ${what}`}:{' '}
            {mount ? setSummary(mount) : <SetWriteIn wheels={block.wheels} />}
          </p>
        )}
        {block.stored && (
          <p className={styles.storagePlace}>
            Lagerplatz {mount?.place ?? <WriteIn />}
          </p>
        )}
      </div>
      <div className={styles.tireRow}>
        <p className={styles.tireSet}>
          <strong>Abmontiert</strong>: {takeOff ? setSummary(takeOff) : <SetWriteIn wheels={block.wheels} />}
        </p>
        <p className={styles.tireQuestion}>
          {block.newTires ? (
            <>
              <Box /> einlagern <Box /> nimmt Kunde mit <Box /> entsorgen · Platz:
            </>
          ) : block.stored ? (
            <>ins Pneuhotel, Platz:</>
          ) : (
            <>
              einlagern? <Box /> Ja <Box /> Nein, Platz:
            </>
          )}{' '}
          <WriteIn />
        </p>
      </div>

      {tires && tires.moreInHotel.length > 0 && (
        <p className={styles.detail}>Weitere Sätze im Pneuhotel: {tires.moreInHotel.map((s) => s.place ?? 'ohne Platz').join(', ')}</p>
      )}

      <table className={styles.tires} aria-label="Profiltiefen">
        <thead>
          <tr>
            <th scope="col">Rad</th>
            <th scope="col" className={styles.wide}>
              {block.newTires ? 'Neu mm' : 'Montiert mm'}
            </th>
            <th scope="col" className={styles.wide}>
              Abmontiert mm
            </th>
            <th scope="col">Zustand/Bemerkung</th>
          </tr>
        </thead>
        <tbody>
          {WHEELS.map((wheel) => {
            // the depth measured when it was stored – to compare, the new one is written next to it
            const last = mount?.depths[wheel.key]
            return (
              <tr key={wheel.key}>
                <th scope="row">{wheel.short}</th>
                <td>{last != null && <span className={styles.lastDepth}>zuletzt {formatDepth(last)}</span>}</td>
                <td />
                <td />
              </tr>
            )
          })}
        </tbody>
      </table>

      {mount?.wheelBolts && (
        <p className={styles.tireWarning}>
          ⚠ Radschrauben beachten – passende Schrauben im Auto suchen{mount.remark && ` (${mount.remark})`}
        </p>
      )}
      <p className={styles.tireCheck}>
        <Box />
        <span>
          Radschrauben mit{' '}
          {mount?.torque != null ? (
            <strong>{mount.torque} Nm</strong>
          ) : (
            <>
              <span className={styles.writeLineShort} aria-hidden /> Nm
            </>
          )}{' '}
          angezogen ·{' '}
          {pressure ? (
            <strong>{pressure}</strong>
          ) : (
            <>
              Luftdruck v <span className={styles.writeLineShort} aria-hidden /> h <span className={styles.writeLineShort} aria-hidden /> bar
            </>
          )}
        </span>
      </p>
    </Block>
  )
}

/** The data of a set to fill in by hand – once per set, not per wheel; the dimension of new tyres is known */
function SetWriteIn({ wheels, withDimension = true }: { wheels: boolean; withDimension?: boolean }) {
  return (
    <span className={styles.setWriteIn}>
      Marke/Modell <WriteIn />
      {withDimension && (
        <>
          {' '}
          Dimension <WriteIn />
        </>
      )}{' '}
      DOT <span className={styles.writeLineShort} aria-hidden />
      {wheels && (
        <>
          {' '}
          Felgen <Box /> Alu <Box /> Stahl
        </>
      )}
    </span>
  )
}
