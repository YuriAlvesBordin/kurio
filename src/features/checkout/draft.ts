export interface CheckoutDraft {
  displayName: string
  username: string
  email: string
  profileName: string
  referralCode: string
  ensName: string
  ensSuffix: string
  secondaryAddress: string
  note: string
  network: string
  provider: string
}

/**
 * Reads the checkout form draft so session expiry or a refresh does not lose typed data.
 * @param userId owner of the draft
 */
export function loadDraft(userId: string): Partial<CheckoutDraft> | null {
  try {
    const raw = sessionStorage.getItem(`kurio.checkout.${userId}`)
    return raw ? (JSON.parse(raw) as Partial<CheckoutDraft>) : null
  } catch {
    return null
  }
}

/**
 * Saves the checkout draft for the current user.
 * @param userId owner of the draft
 * @param draft form values
 */
export function saveDraft(userId: string, draft: Partial<CheckoutDraft>): void {
  try {
    sessionStorage.setItem(`kurio.checkout.${userId}`, JSON.stringify(draft))
  } catch {
    return
  }
}

/**
 * Removes the draft after a confirmed purchase.
 * @param userId owner of the draft
 */
export function clearDraft(userId: string): void {
  try {
    sessionStorage.removeItem(`kurio.checkout.${userId}`)
  } catch {
    return
  }
}
