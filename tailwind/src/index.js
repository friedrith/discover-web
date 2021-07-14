import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './App'
import reportWebVitals from './reportWebVitals'

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()

if (
  window.matchMedia &&
  window.matchMedia('(prefers-color-scheme: dark)').matches
) {
  console.log('dark Mode')
} else {
  console.log('light Mode')
}

window
  .matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', e => {
    const newColorScheme = e.matches ? 'dark' : 'light'

    console.log(`${newColorScheme} Mode`)
  })
