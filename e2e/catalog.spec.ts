import { expect, test } from '@playwright/test'
import { isMobile, open } from './helpers'

test.describe('catalog and URL state', () => {
  test('shows nine cards on the first page with four pages in total', async ({ page }) => {
    await open(page)
    await expect(page.getByTestId('nft-card')).toHaveCount(9)
    await expect(page.getByRole('navigation', { name: 'Paginação' }).getByRole('button', { name: /^Página/ })).toHaveCount(4)
  })

  test('pagination lives in the URL and survives refresh and history navigation', async ({ page }) => {
    await open(page)
    await page.getByRole('button', { name: 'Página 2' }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect(page.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByTestId('nft-card').first()).not.toContainText('Emerald Ape')
    const secondPageFirst = (await page.getByTestId('nft-card').first().innerText()).split('\n')[0]
    await page.reload()
    await expect(page.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByTestId('nft-card').first()).toContainText(secondPageFirst)
    await page.goBack()
    await expect(page).not.toHaveURL(/page=2/)
    await expect(page.getByRole('button', { name: 'Página 1' })).toHaveAttribute('aria-current', 'page')
  })

  test('search is written to the URL and filters results', async ({ page }) => {
    await open(page)
    const field = isMobile(page) ? page.getByLabel('Explorar coleções') : null
    if (field) await field.fill('Emerald')
    else {
      await page.getByRole('button', { name: 'Buscar', exact: true }).click()
      await page.getByLabel('Buscar NFTs').fill('Emerald')
      await page.keyboard.press('Enter')
    }
    await expect(page).toHaveURL(/q=Emerald/)
    await expect(page.getByTestId('nft-card')).toHaveCount(1)
    await expect(page.getByTestId('nft-card').first()).toContainText('Emerald Ape')
  })

  test('changing a filter resets the page and is restored from the URL', async ({ page }) => {
    await open(page, '/?page=2')
    if (isMobile(page)) {
      await page.getByRole('button', { name: 'Abrir filtros' }).click()
      await page.getByRole('dialog').getByRole('button', { name: /^Música/ }).click()
      await page.getByRole('button', { name: 'Ver resultados' }).click()
    } else {
      await page.getByRole('complementary', { name: 'Filtros' }).getByRole('button', { name: /^Música/ }).click()
    }
    await expect(page).toHaveURL(/collections=music/)
    await expect(page).not.toHaveURL(/page=/)
    await expect(page.getByTestId('nft-card').first()).toBeVisible()
    await page.reload()
    await expect(page).toHaveURL(/collections=music/)
    await expect(page.getByTestId('nft-card').first()).toBeVisible()
    await page.goBack()
    await expect(page).not.toHaveURL(/collections=music/)
  })

  test('sorting by price descending orders the first page', async ({ page }) => {
    await open(page, '/?sort=price-desc')
    const prices = await page.getByTestId('nft-card').evaluateAll((cards) =>
      cards.map((card) => Number(card.querySelector('p')?.textContent?.replace(/[^\d.]/g, '') ?? '0')),
    )
    expect(prices).toEqual([...prices].sort((a, b) => b - a))
  })

  test('tabs, price range and network filters combine in the URL', async ({ page }) => {
    await open(page, '/?tab=new&networks=ethereum&min=0.5&max=5')
    await expect(page).toHaveURL(/tab=new/)
    await expect(page.getByTestId('nft-card').first()).toBeVisible()
    for (const card of await page.getByTestId('nft-card').all()) {
      const value = Number((await card.locator('p').first().innerText()).replace(/[^\d.]/g, ''))
      expect(value).toBeGreaterThanOrEqual(0.5)
      expect(value).toBeLessThanOrEqual(5)
    }
  })

  test('invalid URL parameters are ignored instead of breaking the page', async ({ page }) => {
    await open(page, '/?sort=bogus&page=-4&collections=nope&min=abc')
    await expect(page.getByTestId('nft-card')).toHaveCount(9)
  })
})
