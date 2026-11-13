import { expect, type Page } from '@playwright/test'

export const ANA = { email: 'ana@kurio.test', password: 'Kurio@123', name: 'Ana' }
export const BRUNO = { email: 'bruno@kurio.test', password: 'Kurio@456', name: 'Bruno' }

/**
 * Opens a page with a deterministic scenario. The scenario is stored by the mock layer and survives reloads.
 * @param page Playwright page
 * @param path app path
 * @param scenario scenario id
 */
export async function open(page: Page, path = '/', scenario = 'default') {
  const separator = path.includes('?') ? '&' : '?'
  await page.goto(`${path}${separator}scenario=${scenario}`)
  await expect(page.locator('#root')).not.toBeEmpty()
  await page.waitForFunction(() => Boolean(window.__kurioMock))
}

/**
 * Returns true when the current viewport uses the mobile layout.
 * @param page Playwright page
 */
export function isMobile(page: Page): boolean {
  return (page.viewportSize()?.width ?? 1440) < 768
}

/**
 * Signs in through the real login modal.
 * @param page Playwright page
 * @param user credentials
 */
export async function login(page: Page, user: { email: string; password: string } = ANA) {
  const dialog = page.getByRole('dialog')
  if (!page.url().includes('auth=')) {
    if (isMobile(page)) {
      const target = new URL(page.url())
      target.searchParams.set('auth', 'login')
      await page.goto(`${target.pathname}${target.search}`)
    } else await page.getByRole('banner').getByRole('button', { name: 'Entrar' }).click()
  }
  await dialog.getByLabel('E-mail').fill(user.email)
  await dialog.getByLabel('Senha').fill(user.password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(dialog).toBeHidden()
}

/**
 * Adds an NFT to the cart from its detail page using the cart button of the active layout.
 * @param page Playwright page
 * @param id NFT id
 * @param quantity how many units
 */
export async function addToCart(page: Page, id: string, quantity = 1) {
  await page.goto(`/nft/${id}`)
  for (let index = 1; index < quantity; index += 1) {
    await page.getByRole('button', { name: /Aumentar quantidade/ }).filter({ visible: true }).first().click()
  }
  const buy = page.getByRole('button', { name: /^(Comprar|Comprar NFT)$/ }).filter({ visible: true }).first()
  await buy.click()
  await page.waitForURL('**/carrinho')
  await expect(page.getByTestId('cart-row').first()).toBeVisible()
}

/**
 * Selects the network and wallet type, then connects the simulated wallet on the checkout page.
 * @param page Playwright page
 */
export async function connectWallet(page: Page) {
  await page.locator('#network-select').click()
  await page.getByRole('option', { name: 'Ethereum' }).click()
  await page.getByRole('radio', { name: 'MetaMask' }).click()
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(page.getByRole('button', { name: 'Carteira conectada' })).toBeVisible()
}

/**
 * Runs the full path from a detail page to the checkout, signed in.
 * @param page Playwright page
 * @param id NFT id
 * @param quantity units to buy
 */
export async function reachCheckout(page: Page, id = 'nft-001', quantity = 1) {
  await open(page)
  await login(page)
  await addToCart(page, id, quantity)
  await page.getByRole('button', { name: /finalizar/ }).click()
  await page.waitForURL('**/pagamento')
  await expect(page.getByTestId('checkout-row').first()).toBeVisible()
  await expect(page.getByLabel('Nome de exibição *')).not.toHaveValue('')
}
