import formatPriceBasic from '../formatPriceBasic'

import prices from '~/expect/formatPriceBasic.expect'

describe('format basic prices', () => {
  it.each(prices)(
    `should return price $expectedPrice for price $price, currency $currency and locale $locale since: $label`,
    ({ expectedPrice, price, currency, locale }) => {
      expect(formatPriceBasic(price, currency, locale)).toMatch(expectedPrice)
    }
  )
})
