/**
 * Creates a deterministic pseudo random generator so scenarios are reproducible.
 * @param seed integer seed
 */
export function createRandom(seed: number) {
  let state = seed >>> 0
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Builds a stable hexadecimal digest from a string for revisions and fake hashes.
 * @param input text to digest
 * @param length number of hex characters produced
 */
export function hexDigest(input: string, length: number): string {
  let out = ''
  let seed = 5381
  let round = 0
  while (out.length < length) {
    for (let i = 0; i < input.length; i++) seed = ((seed << 5) + seed + input.charCodeAt(i) + round) >>> 0
    out += seed.toString(16).padStart(8, '0')
    round++
  }
  return out.slice(0, length)
}
