import { useState, useEffect } from 'react'
import { 
  Key, 
  Shield, 
  Download, 
  Upload, 
  Trash2, 
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Database,
  Settings as SettingsIcon
} from 'lucide-react'
import { useTrade } from '../context/TradeContext'
import storageService from '../services/StorageService'
import firebaseService from '../services/FirebaseService'

function Settings() {
  const { isApiConfigured, configureApi, user } = useTrade()
  
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [importData, setImportData] = useState('')
  const [showImport, setShowImport] = useState(false)

  // Load existing API key from Firestore
  useEffect(() => {
    const loadApiKey = async () => {
      if (user) {
        const result = await firebaseService.getApiKey(user.uid)
        if (result.success && result.apiKey) {
          setApiKey(result.apiKey)
        } else {
          // Fallback to localStorage
          const localKey = storageService.getApiKey()
          if (localKey) {
            setApiKey(localKey)
          }
        }
      } else {
        // Not logged in, try localStorage
        const localKey = storageService.getApiKey()
        if (localKey) {
          setApiKey(localKey)
        }
      }
    }
    loadApiKey()
  }, [user])

  // Handle API key save
  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      setMessage({ type: 'error', text: 'Please enter an API key' })
      return
    }

    setIsSaving(true)
    setMessage({ type: '', text: '' })

    try {
      const success = await configureApi(apiKey.trim())
      if (success) {
        setMessage({ type: 'success', text: 'API key saved successfully! It will be available across all your devices.' })
      } else {
        setMessage({ type: 'error', text: 'Failed to configure API' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setIsSaving(false)
    }
  }

  // Handle data export
  const handleExport = () => {
    const data = storageService.exportData()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lifestyle-trader-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setMessage({ type: 'success', text: 'Data exported successfully!' })
  }

  // Handle data import
  const handleImport = () => {
    if (!importData.trim()) {
      setMessage({ type: 'error', text: 'Please paste your backup data' })
      return
    }

    try {
      const success = storageService.importData(importData)
      if (success) {
        setMessage({ type: 'success', text: 'Data imported successfully! Refresh the page to see changes.' })
        setImportData('')
        setShowImport(false)
      } else {
        setMessage({ type: 'error', text: 'Failed to import data' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Invalid backup data format' })
    }
  }

  // Handle clear all data
  const handleClearData = () => {
    if (window.confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
      storageService.clearAll()
      setApiKey('')
      setMessage({ type: 'success', text: 'All data cleared. Refresh the page.' })
    }
  }

  // Mask API key for display
  const getMaskedKey = (key) => {
    if (!key) return ''
    if (showApiKey) return key
    if (key.length <= 8) return '••••••••'
    return key.slice(0, 4) + '••••••••' + key.slice(-4)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-midnight-400" />
          Settings
        </h1>
        <p className="text-gray-400 text-sm mt-1">Configure your trading assistant</p>
      </div>

      {/* Message Display */}
      {message.text && (
        <div className={`glass-card p-4 flex items-center gap-3 ${
          message.type === 'success' ? 'border-l-4 border-profit' : 'border-l-4 border-loss'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-profit flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-loss flex-shrink-0" />
          )}
          <p className={message.type === 'success' ? 'text-profit-light' : 'text-loss-light'}>
            {message.text}
          </p>
        </div>
      )}

      {/* API Configuration */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-midnight-500 to-purple-600 flex items-center justify-center">
            <Key className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Gemini API Key</h2>
            <p className="text-sm text-gray-400">Required for AI analysis</p>
          </div>
          {isApiConfigured && (
            <span className="ml-auto px-2 py-1 rounded-full text-xs font-medium bg-profit/20 text-profit-light">
              Configured
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">API Key</label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={showApiKey ? apiKey : getMaskedKey(apiKey)}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Gemini API key"
                className="w-full pr-12"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Shield className="w-4 h-4" />
            <span>Your API key is stored locally and never sent to external servers.</span>
          </div>

          <button
            onClick={handleSaveApiKey}
            disabled={isSaving}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            Save API Key
          </button>

          <p className="text-xs text-gray-500">
            Get your API key from{' '}
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-midnight-400 hover:text-midnight-300 underline"
            >
              Google AI Studio
            </a>
          </p>
        </div>
      </div>

      {/* Data Management */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Data Management</h2>
            <p className="text-sm text-gray-400">Backup and restore your data</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Export */}
          <button
            onClick={handleExport}
            className="btn-ghost w-full flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export All Data
          </button>

          {/* Import */}
          <button
            onClick={() => setShowImport(!showImport)}
            className="btn-ghost w-full flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import Data
          </button>

          {showImport && (
            <div className="space-y-3 animate-fade-in">
              <textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder="Paste your backup JSON here..."
                className="w-full h-32 font-mono text-sm"
              />
              <button
                onClick={handleImport}
                className="btn-success w-full"
              >
                Import
              </button>
            </div>
          )}

          {/* Clear Data */}
          <div className="pt-4 border-t border-white/10">
            <button
              onClick={handleClearData}
              className="btn-danger w-full flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear All Data
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              This will delete all trades, history, and settings permanently.
            </p>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4">About</h2>
        <div className="space-y-2 text-sm text-gray-400">
          <p><strong className="text-white">Lifestyle Trader PWA</strong> v1.0.0</p>
          <p>Your personal trading assistant for low screen-time trading.</p>
          <p className="pt-2">
            Built with React, Tailwind CSS, and Google Gemini AI.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Settings

