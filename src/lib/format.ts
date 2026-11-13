const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })

/**
 * Formats an ISO date as shown in the order receipt, for example "29 Jul, 2026".
 * @param iso ISO 8601 timestamp
 */
export function formatReceiptDate(iso: string): string {
  const parts = dateFormatter.formatToParts(new Date(iso))
  const day = parts.find((part) => part.type === 'day')?.value ?? ''
  const month = (parts.find((part) => part.type === 'month')?.value ?? '').replace('.', '')
  const year = parts.find((part) => part.type === 'year')?.value ?? ''
  return `${day} ${month.charAt(0).toUpperCase()}${month.slice(1)}, ${year}`
}

/**
 * Shortens a hash or address to the "0xA91F...E82C" form.
 * @param value full hash or address
 */
export function shortHash(value: string): string {
  if (value.length <= 12) return value
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}

/**
 * Pads a numeric token identifier to four digits.
 * @param tokenId numeric token id
 */
export function formatTokenId(tokenId: number): string {
  return `#${String(tokenId).padStart(4, '0')}`
}
