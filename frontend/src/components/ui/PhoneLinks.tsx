import { Phone } from 'lucide-react'
import styles from './PhoneLinks.module.css'

/**
 * The numbers of a customer to tap on the tablet (FB-16) – mobile first, the same number twice
 * (mobile = phone) only once.
 */
export function PhoneLinks({ mobile, phone }: { mobile: string | null; phone: string | null }) {
  const numbers = [...new Set([mobile, phone].filter((n): n is string => !!n))]
  return numbers.map((number) => (
    <a key={number} href={`tel:${number.replace(/\s/g, '')}`} className={styles.phone}>
      <Phone aria-hidden /> {number}
    </a>
  ))
}
