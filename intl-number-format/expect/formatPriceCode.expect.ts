const expectedPrices = [
  {
    label: 'normal price in USD',
    price: 1000,
    currency: 'USD',
    locale: 'en-US',
    expectedPrice: 'USD\u00A01,000.00',
  },
  {
    label: 'should follow ISO 4217: https://en.wikipedia.org/wiki/ISO_4217',
    price: 1000.123,
    currency: 'USD',
    locale: 'en-US',
    expectedPrice: 'USD\u00A01,000.12',
  },
  {
    label: 'should show CA',
    price: 1000,
    currency: 'CAD',
    locale: 'en-US',
    expectedPrice: 'CAD\u00A01,000.00',
  },
  {
    label: 'should not show CA',
    price: 1000,
    currency: 'CAD',
    locale: 'en-CA',
    expectedPrice: 'CAD\u00A01,000.00',
  },
  {
    label: 'should show different separators',
    price: 1000,
    currency: 'CAD',
    locale: 'fr-CA',
    expectedPrice: '1\u00A0000,00\u00A0CAD',
  },
  {
    label: 'should show different separators and CA',
    price: 1000,
    currency: 'CAD',
    locale: 'fr-FR',
    expectedPrice: '1\u202F000,00\u00A0CAD',
  },
  {
    label: 'should show euro',
    price: 1000,
    currency: 'EUR',
    locale: 'fr-FR',
    expectedPrice: '1\u202F000,00\u00A0EUR',
  },
  {
    label: 'should show euro with decimals',
    price: 1000.12,
    currency: 'EUR',
    locale: 'fr-FR',
    expectedPrice: '1\u202F000,12\u00A0EUR',
  },
  {
    label: 'should show euro in english',
    price: 1000,
    currency: 'EUR',
    locale: 'en-GB',
    expectedPrice: 'EUR\u00A01,000.00',
  },
  {
    label: 'should show euro in US english',
    price: 1000,
    currency: 'EUR',
    locale: 'en-US',
    expectedPrice: 'EUR\u00A01,000.00',
  },
  {
    label: 'should show euro in german',
    price: 1000,
    currency: 'EUR',
    locale: 'de-DE',
    expectedPrice: '1.000,00\u00A0EUR',
  },
  {
    label: 'should show yen',
    price: 1000,
    currency: 'JPY',
    locale: 'ja-JP',
    expectedPrice: 'JPY\u00A01,000', // some browsers show ￥ some ¥
  },
]

export default expectedPrices
