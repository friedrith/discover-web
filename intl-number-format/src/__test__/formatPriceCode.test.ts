import formatPriceCode from '../formatPriceCode'

import prices from '~/expect/formatPriceCode.expect'

describe('format basic prices', () => {
  it.each(prices)(
    `should return price $expectedPrice for price $price, currency $currency and locale $locale since: $label`,
    ({ expectedPrice, price, currency, locale }) => {
      expect(formatPriceCode(price, currency, locale)).toBe(expectedPrice)
    }
  )
})
