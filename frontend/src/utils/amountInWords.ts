const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
]
const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
]
const SCALES = ['', 'Thousand', 'Million', 'Billion', 'Trillion']

const CURRENCY_WORDS: Record<string, string> = {
  LAK: 'Kip',
  THB: 'Baht',
  USD: 'Dollar',
  CNY: 'Yuan',
}

function threeDigitsToWords(n: number): string {
  const parts: string[] = []
  const hundreds = Math.floor(n / 100)
  const remainder = n % 100
  if (hundreds > 0) parts.push(`${ONES[hundreds]} Hundred`)
  if (remainder > 0) {
    if (remainder < 20) {
      parts.push(ONES[remainder])
    } else {
      const tens = Math.floor(remainder / 10)
      const ones = remainder % 10
      parts.push(ones > 0 ? `${TENS[tens]}-${ONES[ones]}` : TENS[tens])
    }
  }
  return parts.join(' ')
}

/** English cardinal words for a non-negative integer, e.g. 1200000 -> "One Million Two Hundred Thousand". */
export function numberToWords(n: number): string {
  const value = Math.floor(Math.abs(n))
  if (value === 0) return 'Zero'

  const groups: number[] = []
  let remaining = value
  while (remaining > 0) {
    groups.push(remaining % 1000)
    remaining = Math.floor(remaining / 1000)
  }

  const parts: string[] = []
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] === 0) continue
    const groupWords = threeDigitsToWords(groups[i])
    parts.push(SCALES[i] ? `${groupWords} ${SCALES[i]}` : groupWords)
  }
  return parts.join(' ')
}

/** "Say: Kip One Million Two Hundred Thousand Only" — the standard ERP print-document phrasing. */
export function amountInWords(amount: number, currency: string): string {
  const currencyLabel = CURRENCY_WORDS[currency] ?? currency
  const whole = Math.floor(Math.abs(amount))
  const cents = Math.round((Math.abs(amount) - whole) * 100)

  let words = `${currencyLabel} ${numberToWords(whole)}`
  if (cents > 0) {
    words += ` and ${numberToWords(cents)} Cents`
  }
  return `Say: ${words} Only`
}
