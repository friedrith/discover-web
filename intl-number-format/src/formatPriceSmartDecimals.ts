const formatPriceSmartDecimals = (
  price: number,
  currency: string,
  locale: any
) =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    ...(Number.isInteger(price) ? { minimumFractionDigits: 0 } : {}), // if price is an integer, don't show decimals
    // trailingZeroDisplay: 'stripIfInteger' // not supported in es2022-
  }).format(price)

export default formatPriceSmartDecimals
