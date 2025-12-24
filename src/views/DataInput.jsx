import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FileSpreadsheet, 
  Upload, 
  TrendingUp, 
  Activity,
  AlertCircle,
  CheckCircle,
  Loader2,
  Download,
  Save,
  BarChart3,
  FileText
} from 'lucide-react'
import { useTrade } from '../context/TradeContext'
import { parseMarketDataCSV } from '../utils/marketDataCsvParser'
import { parseOptionChainCSV } from '../utils/optionChainCsvParser'
import { formatForDisplay } from '../utils/jsonParser'

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
  
  const [marketDataCsv, setMarketDataCsv] = useState('')
  const [optionChainFile, setOptionChainFile] = useState(null)
  const [optionChainCsv, setOptionChainCsv] = useState('')
  const [parseError, setParseError] = useState('')
  const [parsedData, setParsedData] = useState(null)
  const [displayData, setDisplayData] = useState(null)
  const [success, setSuccess] = useState(false)
  const [isParsing, setIsParsing] = useState(false)

  // Load existing data when instrument changes
  useEffect(() => {
    loadExistingData()
  }, [currentInstrument])

  const loadExistingData = () => {
    const existing = getCurrentMarketData()
    if (existing) {
      try {
        const dataToLoad = typeof existing === 'string' ? JSON.parse(existing) : existing
        
        if (dataToLoad && dataToLoad.marketDataCsv) {
          setMarketDataCsv(dataToLoad.marketDataCsv)
          // Parse and display
          handleMarketDataChange(dataToLoad.marketDataCsv)
        }
        
        if (dataToLoad && dataToLoad.optionChain) {
          setOptionChainCsv(dataToLoad.optionChain)
        }
      } catch (err) {
        console.error('Error loading existing data:', err)
      }
    } else {
      // Clear form if no data
      setMarketDataCsv('')
      setOptionChainCsv('')
      setOptionChainFile(null)
      setParsedData(null)
      setDisplayData(null)
    }
  }

  // Parse market data CSV when input changes
  const handleMarketDataChange = (value) => {
    setMarketDataCsv(value)
    setParseError('')
    setParsedData(null)
    setDisplayData(null)
    setSuccess(false)

    if (!value.trim()) {
      return
    }

    setIsParsing(true)
    try {
      const result = parseMarketDataCSV(value)
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
      setParseError(err.message || 'Invalid CSV format')
      setParsedData(null)
      setDisplayData(null)
    } finally {
      setIsParsing(false)
    }
  }

  // Handle option chain file upload
  const handleOptionChainFile = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setOptionChainFile(file)
    setParseError('')
    setIsParsing(true)

    try {
      const text = await file.text()
      const result = parseOptionChainCSV(text)
      
      if (result.success) {
        setOptionChainCsv(result.data)
        setParseError('')
      } else {
        setParseError(`Option Chain Error: ${result.error}`)
        setOptionChainCsv('')
      }
    } catch (err) {
      setParseError(`Failed to read file: ${err.message}`)
      setOptionChainCsv('')
    } finally {
      setIsParsing(false)
    }
  }

  // Save data to Firestore
  const handleSave = async () => {
    if (!parsedData) {
      setParseError('Please enter valid market data CSV first')
      return
    }

    if (!user) {
      setParseError('Please login to save data')
      return
    }

    setSuccess(false)

    try {
      const dataToSave = {
        marketDataCsv: marketDataCsv,
        optionChain: optionChainCsv,
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
      setParseError('Please enter and parse valid market data CSV first')
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
      optionChain: optionChainCsv || ''
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
          <p className="text-gray-400 text-sm mt-1">Enter CSV data for market analysis</p>
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
            <h2 className="text-lg font-semibold">Parsed Data (Read-Only) - Most Recent Date</h2>
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

      {/* Market Data CSV Input */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-300">
            <FileText className="w-5 h-5" />
            <span className="font-medium">Market Data CSV</span>
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
          Paste CSV data with multiple trading days. The most recent date will be automatically selected for analysis.
        </p>
        <p className="text-xs text-gray-500">
          Expected columns: Date, Open, High, Low, Close, MA ma (50,ma,0), RSI rsi (5), RSI rsi (14), MACD macd (12,26,9), Signal macd (12,26,9), macd (12,26,9)_hist, MA ma (10,ma,0)
        </p>
        <textarea
          value={marketDataCsv}
          onChange={(e) => handleMarketDataChange(e.target.value)}
          placeholder={`"Date","Open","High","Low","Close","MA ma (50,ma,0)","RSI rsi (14)","MACD macd (12,26,9)","Signal macd (12,26,9)","macd (12,26,9)_hist","MA ma (10,ma,0)"
"Wed Dec 24 2025 00:00:00 GMT+0530 (India Standard Time)","26170.65","26236.40","26139.45","26148.45","25892.48","57.45","54.99","45.79","9.20","25993.14"`}
          className="w-full h-64 font-mono text-sm"
        />
        {isParsing && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Parsing CSV and extracting most recent date...</span>
          </div>
        )}
      </div>

      {/* Option Chain CSV File Upload */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2 text-gray-300">
          <FileSpreadsheet className="w-5 h-5" />
          <span className="font-medium">Option Chain Data (CSV File Upload)</span>
        </div>
        <p className="text-sm text-gray-400">
          Upload a CSV file with option chain data. The file will be automatically cleaned and formatted.
        </p>
        
        <div className="flex items-center gap-4">
          <label className="btn-primary flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            {optionChainFile ? optionChainFile.name : 'Upload CSV File'}
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleOptionChainFile}
              className="hidden"
            />
          </label>
          {optionChainFile && (
            <span className="text-sm text-gray-400">
              {optionChainFile.name} ({optionChainCsv ? optionChainCsv.split('\n').length - 1 : 0} rows)
            </span>
          )}
        </div>

        {optionChainCsv && (
          <div className="mt-4">
            <label className="block text-sm text-gray-400 mb-2">Cleaned Option Chain Data (Preview)</label>
            <textarea
              value={optionChainCsv}
              readOnly
              className="w-full h-40 font-mono text-xs bg-midnight-900/50 text-gray-400"
            />
            <p className="text-xs text-gray-500 mt-2">
              This cleaned format will be sent to Gemini for analysis.
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <button
          onClick={() => {
            setMarketDataCsv('')
            setOptionChainCsv('')
            setOptionChainFile(null)
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
