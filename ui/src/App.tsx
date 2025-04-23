import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import States from './pages/States'

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/states/" element={<States />} />
          <Route path="/" element={<Navigate to="/states/" replace />} />
        </Routes>
      </div>
    </div>
  )
}

export default App 