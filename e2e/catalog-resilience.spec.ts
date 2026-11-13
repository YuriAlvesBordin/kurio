import { expect, test } from '@playwright/test'
import { open } from './helpers'

test.describe('catalog under adverse conditions', () => {
  test('empty scenario shows an empty state with a way back', async ({ page }) => {
    await open(page, '/', 'empty')
    await expect(page.getByText('Nenhum NFT encontrado')).toBeVisible()
  })

  test('server errors are retried and then the page recovers', async ({ page }) => {
    await open(page, '/', 'server-errors')
    await expect(page.getByRole('alert').filter({ hasText: 'Não foi possível carregar o catálogo' })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByTestId('nft-card').first()).toBeVisible({ timeout: 15_000 })
  })

  test('offline scenario shows an error with retry and recovers when the network returns', async ({ page }) => {
    await open(page, '/', 'offline')
    await expect(page.getByRole('alert').filter({ hasText: 'Não foi possível carregar o catálogo' })).toBeVisible({ timeout: 15_000 })
    await page.evaluate(() => window.__kurioMock?.setScenario('default'))
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByTestId('nft-card').first()).toBeVisible()
  })

  test('slow responses show skeletons first', async ({ page }) => {
    await open(page, '/', 'slow')
    await expect(page.getByLabel('Carregando NFTs')).toBeVisible()
    await expect(page.getByTestId('nft-card').first()).toBeVisible({ timeout: 15_000 })
  })

  test('out of order responses never overwrite the latest view', async ({ page }) => {
    await open(page, '/', 'jitter')
    await expect(page.getByTestId('nft-card').first()).toBeVisible({ timeout: 15_000 })
    await page.evaluate(() => {
      window.history.pushState({}, '', '/?page=2')
      window.dispatchEvent(new PopStateEvent('popstate'))
      window.history.pushState({}, '', '/?page=3')
      window.dispatchEvent(new PopStateEvent('popstate'))
      window.history.pushState({}, '', '/?page=4')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    await expect(page.getByRole('button', { name: 'Página 4' })).toHaveAttribute('aria-current', 'page', { timeout: 15_000 })
    await page.waitForTimeout(2500)
    await expect(page.getByRole('button', { name: 'Página 4' })).toHaveAttribute('aria-current', 'page')
  })
})
