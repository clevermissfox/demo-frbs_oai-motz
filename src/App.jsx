import { useState } from 'react';
import { auth, db, storage } from './firebase';

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <button>
        Click Me
      </button>
        
    </>
  )
}

export default App
