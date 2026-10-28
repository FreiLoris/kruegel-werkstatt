import styles from './FormerBadge.module.css'

/**
 * "ehemalig" next to a customer's name (FB-27): blocked or former in SwissGarage, kept as the holder
 * of a vehicle – still findable, clearly not a current customer. Nothing for the others.
 */
export function FormerBadge({ customer }: { customer: { former: boolean } }) {
  if (!customer.former) return null
  return (
    <span className={styles.badge} title="In SwissGarage gesperrt bzw. ehemalig – hier nur als Halter eines Fahrzeugs">
      ehemalig
    </span>
  )
}
