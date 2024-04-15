import { test, expect } from '@playwright/test'

import expectedPrices from '~/expect/formatPriceSmartDecimals.expect'

test.describe('FormatPriceSmartDecimals', () => {
  for (const { price, currency, locale, expectedPrice } of expectedPrices) {
    test(`should have a value for ${price} ${currency} ${locale}`, async ({
      page,
    }) => {
      await page.goto(
        `/?format=formatPriceSmartDecimals&price=${price}&currency=${currency}&locale=${locale}`
      )

      await expect(page.getByTestId('price')).toHaveText(expectedPrice)
    })
  }
})
