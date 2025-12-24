import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FileJson, 
  FileSpreadsheet, 
  Upload, 
  TrendingUp, 
  Activity,
  AlertCircle,
  CheckCircle,
  Loader2,
  Download,
  Save,
  BarChart3
} from 'lucide-react'
import { useTrade } from '../context/TradeContext'
import { parseMarketData, formatForDisplay } from '../utils/jsonParser'

function DataInput() {
  const navigate = useNavigate()
  const { 
    currentInstrument,
    setCurrentInstrument,
    saveMarketData, 
    getCurrentMarketData,
    runAnalysis, 
    isLoading, 
    error, 
    isApiConfigured,
    user
  } = useTrade()
  
  const [jsonInput, setJsonInput] = useState('')
  const [optionChainCsv, setOptionChainCsv] = useState('')
  const [parseError, setParseError] = useState('')
  const [parsedData, setParsedData] = useState(null)
  const [displayData, setDisplayData] = useState(null)
  const [success, setSuccess] = useState(false)

  // Load existing data when instrument changes
  useEffect(() => {
    loadExistingData()
  }, [currentInstrument])

  const loadExistingData = () => {
    const existing = getCurrentMarketData()
    if (existing) {
      try {
        // Handle different data formats
        let dataToLoad
        if (typeof existing === 'string') {
          try {
            dataToLoad = JSON.parse(existing)
          } catch (parseErr) {
            console.error('Error parsing existing data as JSON:', parseErr)
            // If it's not valid JSON, it might be the raw data object
            dataToLoad = existing
          }
        } else if (existing && typeof existing === 'object') {
          // Check if it's the Firestore document structure
          dataToLoad = existing.data || existing
        } else {
          dataToLoad = existing
        }
        
        if (dataToLoad && dataToLoad.jsonData) {
          // Ensure jsonData is properly formatted
          const jsonData = Array.isArray(dataToLoad.jsonData) 
            ? dataToLoad.jsonData 
            : (typeof dataToLoad.jsonData === 'string' 
                ? JSON.parse(dataToLoad.jsonData) 
                : [dataToLoad.jsonData])
          
          setJsonInput(JSON.stringify(jsonData, null, 2))
          
          // Parse and display
          const result = parseMarketData(JSON.stringify(jsonData))
          if (result.success) {
            setParsedData(result.data)
            setDisplayData(formatForDisplay(result.data))
          }
        }
        
        if (dataToLoad && dataToLoad.optionChain) {
          setOptionChainCsv(dataToLoad.optionChain)
        }
      } catch (err) {
        console.error('Error loading existing data:', err)
        setParseError(`Error loading data: ${err.message}`)
      }
    } else {
      // Clear form if no data
      setJsonInput('')
      setOptionChainCsv('')
      setParsedData(null)
      setDisplayData(null)
    }
  }

  // Parse JSON when input changes
  const handleJsonChange = (value) => {
    setJsonInput(value)
    setParseError('')
    setParsedData(null)
    setDisplayData(null)
    setSuccess(false)

    if (!value.trim()) {
      return
    }

    try {
      const result = parseMarketData(value)
      if (result.success) {
        setParsedData(result.data)
        setDisplayData(formatForDisplay(result.data))
        setParseError('')
      } else {
        setParseError(result.error)
        setParsedData(null)
        setDisplayData(null)
      }
    } catch (err) {
      setParseError(err.message || 'Invalid JSON format')
      setParsedData(null)
      setDisplayData(null)
    }
  }

  // Save data to Firestore
  const handleSave = async () => {
    if (!parsedData) {
      setParseError('Please enter valid JSON data first')
      return
    }

    if (!user) {
      setParseError('Please login to save data')
      return
    }

    setSuccess(false)

    try {
      // Parse JSON to get array (handle both single object and array)
      let jsonArray
      try {
        const parsed = JSON.parse(jsonInput)
        jsonArray = Array.isArray(parsed) ? parsed : [parsed]
      } catch (parseErr) {
        setParseError(`Invalid JSON format: ${parseErr.message}`)
        return
      }
      
      const dataToSave = {
        jsonData: jsonArray,
        optionChain: optionChainCsv || '', // Ensure it's a string
        instrument: currentInstrument,
        date: parsedData.date
      }

      const saved = await saveMarketData(currentInstrument, dataToSave)
      
      if (saved) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (err) {
      setParseError(err.message || 'Failed to save data')
    }
  }

  // Submit and analyze
  const handleAnalyze = async () => {
    if (!parsedData) {
      setParseError('Please enter and parse valid JSON data first')
      return
    }

    if (!isApiConfigured) {
      navigate('/settings')
      return
    }

    // Prepare data for analysis
    const analysisData = {
      date: parsedData.date,
      spot: parsedData.spot,
      indicators: parsedData.indicators,
      optionChain: optionChainCsv
    }

    const analysis = await runAnalysis(analysisData)
    
    if (analysis) {
      setSuccess(true)
      setTimeout(() => {
        navigate('/analysis')
      }, 1000)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Market Data Input</h1>
          <p className="text-gray-400 text-sm mt-1">Enter JSON data for market analysis</p>
        </div>
        
        {/* Instrument Selector */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-400 font-medium">Instrument:</label>
          <select
            value={currentInstrument}
            onChange={(e) => {
              setCurrentInstrument(e.target.value)
              setSuccess(false)
            }}
            className="bg-midnight-950/50 border border-white/10 rounded-lg px-4 py-2 text-white font-semibold focus:outline-none focus:ring-2 focus:ring-midnight-500/50"
          >
            <option value="NIFTY">NIFTY</option>
            <option value="BANKNIFTY">BANK NIFTY</option>
          </select>
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
          <div className="flex-1">
            <p className="text-loss-light font-medium">Error</p>
            <p className="text-loss-light text-sm mt-1 whitespace-pre-line">{error || parseError}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="glass-card p-4 border-l-4 border-profit flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-profit flex-shrink-0" />
          <p className="text-profit-light">Data saved successfully!</p>
        </div>
      )}

      {/* Read-only Display Section */}
      {displayData && (
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-midnight-400" />
            <h2 className="text-lg font-semibold">Parsed Data (Read-Only)</h2>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Date</label>
            <input
              type="text"
              value={displayData.date}
              readOnly
              className="w-full bg-midnight-900/50 text-gray-300 cursor-not-allowed"
            />
          </div>

          {/* Spot Price OHLC */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-midnight-400" />
              <h3 className="text-md font-semibold">Spot Price (OHLC)</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Open</label>
                <input
                  type="text"
                  value={displayData.spot.open}
                  readOnly
                  className="w-full bg-midnight-900/50 text-gray-300 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">High</label>
                <input
                  type="text"
                  value={displayData.spot.high}
                  readOnly
                  className="w-full bg-midnight-900/50 text-gray-300 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Low</label>
                <input
                  type="text"
                  value={displayData.spot.low}
                  readOnly
                  className="w-full bg-midnight-900/50 text-gray-300 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Close</label>
                <input
                  type="text"
                  value={displayData.spot.close}
                  readOnly
                  className="w-full bg-midnight-900/50 text-gray-300 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Technical Indicators */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-purple-400" />
              <h3 className="text-md font-semibold">Technical Indicators</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-xs text-gray-500 mb-1">10 DMA</label>
                <input
                  type="text"
                  value={displayData.indicators.dma10}
                  readOnly
                  className="w-full bg-midnight-900/50 text-gray-300 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">50 DMA</label>
                <input
                  type="text"
                  value={displayData.indicators.dma50}
                  readOnly
                  className="w-full bg-midnight-900/50 text-gray-300 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">RSI (14)</label>
                <input
                  type="text"
                  value={displayData.indicators.rsi}
                  readOnly
                  className="w-full bg-midnight-900/50 text-gray-300 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-2">MACD</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Value</label>
                  <input
                    type="text"
                    value={displayData.indicators.macd.value}
                    readOnly
                    className="w-full bg-midnight-900/50 text-gray-300 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Signal</label>
                  <input
                    type="text"
                    value={displayData.indicators.macd.signal}
                    readOnly
                    className="w-full bg-midnight-900/50 text-gray-300 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Histogram</label>
                  <input
                    type="text"
                    value={displayData.indicators.macd.histogram}
                    readOnly
                    className="w-full bg-midnight-900/50 text-gray-300 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* JSON Input */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-300">
            <FileJson className="w-5 h-5" />
            <span className="font-medium">Market Data JSON</span>
          </div>
          <button
            onClick={loadExistingData}
            className="btn-ghost flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Load Existing
          </button>
        </div>
        <p className="text-sm text-gray-400">
          Paste JSON array with Date, OHLC, and indicators. Latest entry will be used for analysis.
        </p>
        <textarea
          value={jsonInput}
          onChange={(e) => handleJsonChange(e.target.value)}
          placeholder={`[
  {
    "Date": "Mon Dec 01 2025 00:00:00 GMT+0530 (India Standard Time)",
    "Open": "60102.05",
    "High": "60114.30",
    "Low": "59527.60",
    "Close": "59681.35",
    "MA_ma_(50,ma,0)": "57386.41",
    "RSI_rsi_(14)": "70.51",
    "MACD_macd_(12,26,9)": "620.28",
    "Signal_macd_(12,26,9)": "591.17",
    "macd_(12,26,9)_hist": "29.11",
    "MA_ma_(10,ma,0)": "59268.58"
  }
]`}
          className="w-full h-64 font-mono text-sm"
        />
      </div>

      {/* Option Chain CSV */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2 text-gray-300">
          <FileSpreadsheet className="w-5 h-5" />
          <span className="font-medium">Option Chain Data (CSV)</span>
        </div>
        <p className="text-sm text-gray-400">
          Paste CSV data with columns: Strike, Call OI, Call LTP, Put OI, Put LTP
        </p>
        <textarea
          value={optionChainCsv}
          onChange={(e) => setOptionChainCsv(e.target.value)}
          placeholder={`Strike,CallOI,CallLTP,PutOI,PutLTP
21400,45000,180,35000,90
21500,50000,150,40000,120
21600,55000,100,45000,160`}
          className="w-full h-40 font-mono text-sm"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <button
          onClick={() => {
            setJsonInput('')
            setOptionChainCsv('')
            setParsedData(null)
            setDisplayData(null)
            setParseError('')
            setSuccess(false)
          }}
          className="btn-ghost"
        >
          Clear
        </button>
        <button
          onClick={handleSave}
          disabled={isLoading || !parsedData || !user}
          className="btn-primary flex items-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Data
        </button>
        <button
          onClick={handleAnalyze}
          disabled={isLoading || !parsedData || !isApiConfigured}
          className="btn-success flex items-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <TrendingUp className="w-4 h-4" />
          )}
          Analyze Market
        </button>
      </div>
    </div>
  )
}

export default DataInput
