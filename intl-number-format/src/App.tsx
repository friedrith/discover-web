import formatPriceBasic from './formatPriceBasic'
import formatPriceCode from './formatPriceCode'
import formatPriceSmartDecimals from './formatPriceSmartDecimals'

const formatFunction = {
  formatPriceBasic,
  formatPriceCode,
  formatPriceSmartDecimals,
}

export default function App() {
  const params = new URL(document.location.toString()).searchParams

  const locale = params.get('locale') ?? 'en-US'
  const currency = params.get('currency') ?? 'USD'
  const price = parseFloat(params.get('price') ?? '1234.56')
  const format = params.get('format') ?? 'formatPriceBasic'

  const fun = formatFunction[format]

  return <div data-testid='price'>{fun(price, currency, locale)}</div>
}
