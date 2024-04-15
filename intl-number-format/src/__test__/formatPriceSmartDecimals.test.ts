import formatPriceSmartDecimals from '../formatPriceSmartDecimals'

import expectedPrices from '~/expect/formatPriceSmartDecimals.expect'

describe('format prices and show decimals only for float', () => {
  it.each(expectedPrices)(
    `should return price $expectedPrice for price $price, currency $currency and locale $locale since: $label`,
    ({ expectedPrice, price, currency, locale }) => {
      expect(formatPriceSmartDecimals(price, currency, locale)).toMatch(
        expectedPrice
      )
    }
  )
})
