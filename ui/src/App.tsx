import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import States from './pages/States'
import RawListView from './pages/RawListView'

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);
  
  return (
    <Link 
      to={to} 
      className={`px-4 py-2 rounded-md ${
        isActive 
          ? 'bg-blue-500 text-white' 
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {children}
    </Link>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Cell Culture Tracker</h1>
          <nav className="flex space-x-4">
            <NavLink to="/states">Cell States</NavLink>
            <NavLink to="/raw-list">Raw List View</NavLink>
          </nav>
        </header>
        
        <Routes>
          <Route path="/states/" element={<States />} />
          <Route path="/raw-list/" element={<RawListView />} />
          <Route path="/" element={<Navigate to="/states/" replace />} />
        </Routes>
      </div>
    </div>
  )
}

export default App 