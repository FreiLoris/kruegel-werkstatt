import type { ReactNode } from 'react'
import { Block, Box, WriteIn } from './SheetParts'
import type { TiresBlock } from './sheetBlocks'
import styles from './TaskSheet.module.css'

const POSITIONS = ['VL', 'VR', 'HL', 'HR'] as const

/**
 * Tire change (FB-06): a table per set to fill in by hand – the mounted one and the removed one,
 * whose tread depths go into the tire hotel. From the tire hotel the storage place is printed big;
 * until the tire hotel exists (FB-07) it is a line to write on, later it and the stored tire data
 * are printed in.
 */
export function TireBlock({ block }: { block: TiresBlock }) {
  const what = block.wheels ? 'Räder' : 'Reifen'

  return (
    <Block title="Radwechsel">
      {block.stored && (
        <p className={styles.storagePlace}>
          Lagerplatz: <WriteIn wide />
        </p>
      )}

      <TireTable caption={block.stored ? `Montiert – ${what} aus dem Pneuhotel` : `Montiert – mitgebrachte ${what}`} wheels={block.wheels} />

      <TireTable caption={`Abmontierte ${what}`} wheels={block.wheels}>
        {block.stored ? (
          <>
            {' '}
            – ins Pneuhotel, Lagerplatz: <WriteIn />
          </>
        ) : (
          <>
            {' '}
            einlagern? <Box /> Ja <Box /> Nein → Lagerplatz: <WriteIn />
          </>
        )}
      </TireTable>

      <p className={styles.tireCheck}>
        <Box /> Radschrauben mit Drehmoment angezogen
      </p>
    </Block>
  )
}

/** @param children what follows the caption, e.g. whether the set is stored */
function TireTable({ caption, wheels, children }: { caption: string; wheels: boolean; children?: ReactNode }) {
  return (
    <>
      <p className={styles.tireHead}>
        <span className={styles.tireQuestion}>
          {caption}
          {children}
        </span>
        {wheels && (
          <span className={styles.rims}>
            Felgen <Box /> Alu <Box /> Stahl
          </span>
        )}
      </p>
      <table className={styles.tires} aria-label={caption}>
        <thead>
          <tr>
            <th scope="col">Rad</th>
            <th scope="col" className={styles.narrow}>
              Profil mm
            </th>
            <th scope="col">Marke</th>
            <th scope="col">Modell</th>
            <th scope="col" className={styles.wide}>
              Dimension
            </th>
            <th scope="col" className={styles.narrow}>
              DOT/Alter
            </th>
            <th scope="col" className={styles.widest}>
              Zustand/Bemerkung
            </th>
          </tr>
        </thead>
        <tbody>
          {POSITIONS.map((position) => (
            <tr key={position}>
              <th scope="row">{position}</th>
              <td />
              <td />
              <td />
              <td />
              <td />
              <td />
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
