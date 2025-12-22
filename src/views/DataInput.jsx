import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FileJson, 
  FileSpreadsheet, 
  Upload, 
  TrendingUp, 
  Activity,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { useTrade } from '../context/TradeContext'

function DataInput() {
  const navigate = useNavigate()
  const { saveMarketData, runAnalysis, isLoading, error, isApiConfigured } = useTrade()
  
  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    spot: {
      open: '',
      high: '',
      low: '',
      close: ''
    },
    indicators: {
      dma10: '',
      dma50: '',
      rsi: '',
      macd: {
        value: '',
        signal: '',
        histogram: ''
      }
    },
    optionChain: ''
  })
  
  const [inputMode, setInputMode] = useState('manual') // 'manual' | 'json' | 'csv'
  const [jsonInput, setJsonInput] = useState('')
  const [parseError, setParseError] = useState('')
  const [success, setSuccess] = useState(false)

  // Handle form field changes
  const handleChange = (section, field, value) => {
    if (section === 'spot') {
      setFormData(prev => ({
        ...prev,
        spot: { ...prev.spot, [field]: value }
      }))
    } else if (section === 'indicators') {
      if (field.includes('macd.')) {
        const macdField = field.split('.')[1]
        setFormData(prev => ({
          ...prev,
          indicators: {
            ...prev.indicators,
            macd: { ...prev.indicators.macd, [macdField]: value }
          }
        }))
      } else {
        setFormData(prev => ({
          ...prev,
          indicators: { ...prev.indicators, [field]: value }
        }))
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  // Parse JSON input
  const parseJsonInput = () => {
    try {
      const parsed = JSON.parse(jsonInput)
      setFormData({
        date: parsed.date || formData.date,
        spot: {
          open: parsed.spot?.open || parsed.open || '',
          high: parsed.spot?.high || parsed.high || '',
          low: parsed.spot?.low || parsed.low || '',
          close: parsed.spot?.close || parsed.close || ''
        },
        indicators: {
          dma10: parsed.indicators?.dma10 || parsed.dma10 || '',
          dma50: parsed.indicators?.dma50 || parsed.dma50 || '',
          rsi: parsed.indicators?.rsi || parsed.rsi || '',
          macd: {
            value: parsed.indicators?.macd?.value || parsed.macd?.value || '',
            signal: parsed.indicators?.macd?.signal || parsed.macd?.signal || '',
            histogram: parsed.indicators?.macd?.histogram || parsed.macd?.histogram || ''
          }
        },
        optionChain: parsed.optionChain || ''
      })
      setParseError('')
      setInputMode('manual')
    } catch (err) {
      setParseError('Invalid JSON format. Please check your input.')
    }
  }

  // Parse CSV input for option chain
  const handleOptionChainPaste = (value) => {
    setFormData(prev => ({ ...prev, optionChain: value }))
  }

  // Submit and analyze
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSuccess(false)
    
    if (!isApiConfigured) {
      navigate('/settings')
      return
    }

    // Validate required fields
    const requiredFields = [
      formData.spot.open,
      formData.spot.high,
      formData.spot.low,
      formData.spot.close,
      formData.indicators.dma10,
      formData.indicators.dma50,
      formData.indicators.rsi
    ]

    if (requiredFields.some(f => !f)) {
      setParseError('Please fill in all required fields (Spot OHLC, DMAs, RSI)')
      return
    }

    // Save and analyze
    saveMarketData(formData)
    const analysis = await runAnalysis(formData)
    
    if (analysis) {
      setSuccess(true)
      setTimeout(() => {
        navigate('/analysis')
      }, 1000)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Market Data Input</h1>
          <p className="text-gray-400 text-sm mt-1">Enter daily market data for analysis</p>
        </div>
        
        {/* Input Mode Toggle */}
        <div className="flex gap-2 bg-white/5 p-1 rounded-lg">
          <button
            onClick={() => setInputMode('manual')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              inputMode === 'manual' 
                ? 'bg-midnight-500 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Manual
          </button>
          <button
            onClick={() => setInputMode('json')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1 ${
              inputMode === 'json' 
                ? 'bg-midnight-500 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FileJson className="w-4 h-4" />
            JSON
          </button>
        </div>
      </div>

      {/* API Warning */}
      {!isApiConfigured && (
        <div className="glass-card p-4 border-l-4 border-warning flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />
          <div>
            <p className="text-warning font-medium">API Key Required</p>
            <p className="text-gray-400 text-sm">Please configure your Gemini API key in Settings before analyzing.</p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {(error || parseError) && (
        <div className="glass-card p-4 border-l-4 border-loss flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-loss flex-shrink-0" />
          <p className="text-loss-light">{error || parseError}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="glass-card p-4 border-l-4 border-profit flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-profit flex-shrink-0" />
          <p className="text-profit-light">Analysis complete! Redirecting...</p>
        </div>
      )}

      {/* JSON Input Mode */}
      {inputMode === 'json' && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-gray-300">
            <FileJson className="w-5 h-5" />
            <span className="font-medium">Paste JSON Data</span>
          </div>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder={`{
  "date": "2024-01-15",
  "spot": { "open": 21500, "high": 21650, "low": 21450, "close": 21600 },
  "indicators": {
    "dma10": 21400,
    "dma50": 21200,
    "rsi": 55,
    "macd": { "value": 50, "signal": 40, "histogram": 10 }
  },
  "optionChain": "Strike,CallOI,CallLTP,PutOI,PutLTP\\n21500,50000,150,40000,120"
}`}
            className="w-full h-64 font-mono text-sm"
          />
          <button
            onClick={parseJsonInput}
            className="btn-primary flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Parse & Fill Form
          </button>
        </div>
      )}

      {/* Manual Input Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date */}
        <div className="glass-card p-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">Date</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => handleChange('root', 'date', e.target.value)}
            className="w-full max-w-xs"
          />
        </div>

        {/* Spot Price OHLC */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-midnight-400" />
            <h2 className="text-lg font-semibold">Spot Price (OHLC)</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Open *</label>
              <input
                type="number"
                step="0.01"
                value={formData.spot.open}
                onChange={(e) => handleChange('spot', 'open', e.target.value)}
                placeholder="21500.00"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">High *</label>
              <input
                type="number"
                step="0.01"
                value={formData.spot.high}
                onChange={(e) => handleChange('spot', 'high', e.target.value)}
                placeholder="21650.00"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Low *</label>
              <input
                type="number"
                step="0.01"
                value={formData.spot.low}
                onChange={(e) => handleChange('spot', 'low', e.target.value)}
                placeholder="21450.00"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Close *</label>
              <input
                type="number"
                step="0.01"
                value={formData.spot.close}
                onChange={(e) => handleChange('spot', 'close', e.target.value)}
                placeholder="21600.00"
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Technical Indicators */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold">Technical Indicators</h2>
          </div>
          
          {/* Moving Averages & RSI */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm text-gray-400 mb-1">10 DMA *</label>
              <input
                type="number"
                step="0.01"
                value={formData.indicators.dma10}
                onChange={(e) => handleChange('indicators', 'dma10', e.target.value)}
                placeholder="21400.00"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">50 DMA *</label>
              <input
                type="number"
                step="0.01"
                value={formData.indicators.dma50}
                onChange={(e) => handleChange('indicators', 'dma50', e.target.value)}
                placeholder="21200.00"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">RSI (14) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.indicators.rsi}
                onChange={(e) => handleChange('indicators', 'rsi', e.target.value)}
                placeholder="55"
                className="w-full"
              />
            </div>
          </div>

          {/* MACD */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">MACD</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Value</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.indicators.macd.value}
                  onChange={(e) => handleChange('indicators', 'macd.value', e.target.value)}
                  placeholder="50"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Signal</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.indicators.macd.signal}
                  onChange={(e) => handleChange('indicators', 'macd.signal', e.target.value)}
                  placeholder="40"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Histogram</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.indicators.macd.histogram}
                  onChange={(e) => handleChange('indicators', 'macd.histogram', e.target.value)}
                  placeholder="10"
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Option Chain Data */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold">Option Chain Data</h2>
          </div>
          <p className="text-sm text-gray-400 mb-3">
            Paste CSV or JSON data with columns: Strike, Call OI, Call LTP, Put OI, Put LTP
          </p>
          <textarea
            value={formData.optionChain}
            onChange={(e) => handleOptionChainPaste(e.target.value)}
            placeholder={`Strike,CallOI,CallLTP,PutOI,PutLTP
21400,45000,180,35000,90
21500,50000,150,40000,120
21600,55000,100,45000,160
21700,40000,70,50000,210`}
            className="w-full h-40 font-mono text-sm"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => {
              setFormData({
                date: new Date().toISOString().split('T')[0],
                spot: { open: '', high: '', low: '', close: '' },
                indicators: {
                  dma10: '',
                  dma50: '',
                  rsi: '',
                  macd: { value: '', signal: '', histogram: '' }
                },
                optionChain: ''
              })
              setParseError('')
            }}
            className="btn-ghost"
          >
            Clear Form
          </button>
          <button
            type="submit"
            disabled={isLoading || !isApiConfigured}
            className="btn-success flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4" />
                Analyze Market
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default DataInput

