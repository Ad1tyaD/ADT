import { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  TrendingUp, 
  Settings as SettingsIcon, 
  FileInput,
  Menu,
  X,
  Wifi,
  WifiOff
} from 'lucide-react'

// Views
import Dashboard from './views/Dashboard'
import Analysis from './views/Analysis'
import DataInput from './views/DataInput'
import Settings from './views/Settings'

// Context
import { TradeProvider } from './context/TradeContext'

function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const location = useLocation()

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location])

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/input', icon: FileInput, label: 'Data Input' },
    { path: '/analysis', icon: TrendingUp, label: 'Analysis' },
    { path: '/settings', icon: SettingsIcon, label: 'Settings' },
  ]

  return (
    <TradeProvider>
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="glass-card rounded-none border-x-0 border-t-0 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-midnight-500 to-purple-600 flex items-center justify-center shadow-lg shadow-midnight-500/30">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold gradient-text">Lifestyle Trader</h1>
                  <p className="text-xs text-gray-500">Trading Assistant</p>
                </div>
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map(({ path, icon: Icon, label }) => (
                  <NavLink
                    key={path}
                    to={path}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      ${isActive 
                        ? 'bg-midnight-500/30 text-white' 
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </NavLink>
                ))}
              </nav>

              {/* Status & Mobile Menu Toggle */}
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
                  isOnline ? 'bg-profit/20 text-profit-light' : 'bg-loss/20 text-loss-light'
                }`}>
                  {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
                </div>

                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <nav className="md:hidden border-t border-white/10 px-4 py-2 animate-fade-in">
              {navItems.map(({ path, icon: Icon, label }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                    ${isActive 
                      ? 'bg-midnight-500/30 text-white' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </NavLink>
              ))}
            </nav>
          )}
        </header>

        {/* Main Content */}
        <main className="flex-1 container mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/input" element={<DataInput />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/10 py-4 text-center text-xs text-gray-500">
          <p>Lifestyle Trader PWA • Capital Preservation First</p>
        </footer>
      </div>
    </TradeProvider>
  )
}

export default App

