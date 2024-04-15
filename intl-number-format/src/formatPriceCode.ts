const formatPriceCode = (
  price: number,
  currency: string,
  locale: Intl.LocalesArgument
) =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
  }).format(price)

export default formatPriceCode
