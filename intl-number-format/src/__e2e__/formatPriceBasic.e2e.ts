import { test, expect } from '@playwright/test'

import expectedPrices from '~/expect/formatPriceBasic.expect'

test.describe('FormatPriceBasic', () => {
  for (const { price, currency, locale, expectedPrice } of expectedPrices) {
    test(`should have a value for ${price} ${currency} ${locale}`, async ({
      page,
    }) => {
      await page.goto(
        `/?format=formatPriceBasic&price=${price}&currency=${currency}&locale=${locale}`
      )

      await expect(page.getByTestId('price')).toHaveText(expectedPrice)
    })
  }
})
