import { Block, WriteIn } from './SheetParts'
import styles from './TaskSheet.module.css'

/**
 * Insurance case (FB-06): the insurance with its phone, so the workshop can call about the claim,
 * and the claim number – printed when known, else a line to write it on. One line, so the sheet
 * stays on one page also with a tire change.
 */
export function InsuranceBlock({
  insurance,
  claimNumber,
}: {
  insurance?: { name: string; phone: string | null; email: string | null }
  claimNumber: string | null
}) {
  return (
    <Block title="Versicherungsfall">
      <p className={styles.insurance}>
        <strong>{insurance?.name ?? '–'}</strong>
        {insurance?.phone && <span>Tel. {insurance.phone}</span>}
        {insurance?.email && <span>{insurance.email}</span>}
        <span className={styles.claimNumber}>
          Schadennummer: {claimNumber ? <strong>{claimNumber}</strong> : <WriteIn />}
        </span>
      </p>
    </Block>
  )
}
