const formatPriceBasic = (
  price: number,
  currency: string,
  locale: Intl.LocalesArgument
) =>
  new Intl.NumberFormat(locale, { style: 'currency', currency }).format(price)

export default formatPriceBasic
