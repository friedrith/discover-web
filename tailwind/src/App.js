import logo from './logo.svg'
import './App.css'

function App() {
  return (
    <div className='App bg-white dark:bg-gray-800'>
      <div className='p-6 max-w-sm mx-auto dark:bg-white bg-gray-800 rounded-xl shadow-md flex items-center space-x-4'>
        <div className='flex-shrink-0'>
          <img className='h-12 w-12' src={logo} alt='ChitChat Logo' />
        </div>
        <div>
          <div className='text-xl font-medium dark:text-black text-white'>
            ChitChat
          </div>
          <p className='dark:text-gray-500 text-gray-400'>
            You have a new message!
          </p>
        </div>
      </div>
      <button class='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'>
        Foo
      </button>
    </div>
  )
}

export default App
