const DECIMALS = 18
const SCALE = 10n ** BigInt(DECIMALS)

/**
 * Parses a decimal ETH string into wei as a bigint so arithmetic never loses precision.
 * @param value decimal string such as "1.19"
 */
export function parseEth(value: string): bigint {
  const trimmed = value.trim()
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) throw new Error(`Invalid ETH amount: ${value}`)
  const negative = trimmed.startsWith('-')
  const [whole, fraction = ''] = trimmed.replace('-', '').split('.')
  const padded = (fraction + '0'.repeat(DECIMALS)).slice(0, DECIMALS)
  const wei = BigInt(whole) * SCALE + BigInt(padded)
  return negative ? -wei : wei
}

/**
 * Serializes wei into a canonical decimal ETH string without trailing zeros.
 * @param wei amount in wei
 */
export function toEthString(wei: bigint): string {
  const negative = wei < 0n
  const abs = negative ? -wei : wei
  const whole = abs / SCALE
  const fraction = (abs % SCALE).toString().padStart(DECIMALS, '0').replace(/0+$/, '')
  const text = fraction ? `${whole}.${fraction}` : `${whole}`
  return negative ? `-${text}` : text
}

/**
 * Adds decimal ETH strings with exact precision.
 * @param values decimal strings
 */
export function sumEth(values: string[]): string {
  return toEthString(values.reduce((acc, item) => acc + parseEth(item), 0n))
}

/**
 * Multiplies a decimal ETH string by an integer quantity.
 * @param value decimal string
 * @param quantity integer quantity
 */
export function mulEth(value: string, quantity: number): string {
  return toEthString(parseEth(value) * BigInt(quantity))
}

/**
 * Applies a basis points percentage to a decimal ETH string, rounding down.
 * @param value decimal string
 * @param basisPoints percentage in basis points where 1000 equals 10 percent
 */
export function percentOfEth(value: string, basisPoints: number): string {
  return toEthString((parseEth(value) * BigInt(basisPoints)) / 10000n)
}

/**
 * Subtracts two decimal ETH strings.
 * @param a minuend
 * @param b subtrahend
 */
export function subEth(a: string, b: string): string {
  return toEthString(parseEth(a) - parseEth(b))
}

/**
 * Compares two decimal ETH strings numerically.
 * @param a first value
 * @param b second value
 */
export function compareEth(a: string, b: string): number {
  const diff = parseEth(a) - parseEth(b)
  return diff === 0n ? 0 : diff > 0n ? 1 : -1
}

/**
 * Formats a decimal ETH string for display with a minimum of two decimals and a maximum of the given precision.
 * @param value decimal string
 * @param maxDecimals maximum fraction digits shown
 */
export function formatEth(value: string, maxDecimals = 3): string {
  const wei = parseEth(value)
  const negative = wei < 0n
  const abs = negative ? -wei : wei
  const factor = 10n ** BigInt(DECIMALS - maxDecimals)
  const rounded = (abs / factor) * factor
  const whole = rounded / SCALE
  let fraction = (rounded % SCALE).toString().padStart(DECIMALS, '0').slice(0, maxDecimals)
  fraction = fraction.replace(/0+$/, '')
  while (fraction.length < 2) fraction += '0'
  return `${negative ? '-' : ''}${whole}.${fraction}`
}

/**
 * Formats an ETH amount with the currency suffix used across the interface.
 * @param value decimal string
 * @param maxDecimals maximum fraction digits shown
 */
export function formatEthLabel(value: string, maxDecimals = 3): string {
  return `${formatEth(value, maxDecimals)} ETH`
}
