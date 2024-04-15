import { test, expect } from '@playwright/test'

import expectedPrices from '~/expect/formatPriceCode.expect'

test.describe('FormatPriceCode', () => {
  for (const { price, currency, locale, expectedPrice } of expectedPrices) {
    test(`should have a value for ${price} ${currency} ${locale}`, async ({
      page,
    }) => {
      await page.goto(
        `/?format=formatPriceCode&price=${price}&currency=${currency}&locale=${locale}`
      )

      await expect(page.getByTestId('price')).toHaveText(expectedPrice)
    })
  }
})
