import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import storageService from '../services/StorageService'
import geminiService from '../services/GeminiService'

const TradeContext = createContext(null)

export function TradeProvider({ children }) {
  // State
  const [isApiConfigured, setIsApiConfigured] = useState(false)
  const [activeTrades, setActiveTrades] = useState([])
  const [tradeHistory, setTradeHistory] = useState([])
  const [lastAnalysis, setLastAnalysis] = useState(null)
  const [marketData, setMarketData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Initialize on mount
  useEffect(() => {
    const apiKey = storageService.getApiKey()
    if (apiKey) {
      try {
        geminiService.initialize(apiKey)
        setIsApiConfigured(true)
      } catch (err) {
        console.error('Failed to initialize Gemini:', err)
      }
    }

    setActiveTrades(storageService.getActiveTrades())
    setTradeHistory(storageService.getTradeHistory())
    setLastAnalysis(storageService.getLastAnalysis())
    setMarketData(storageService.getMarketData())
  }, [])

  // Configure API
  const configureApi = useCallback((apiKey) => {
    try {
      geminiService.initialize(apiKey)
      storageService.saveApiKey(apiKey)
      setIsApiConfigured(true)
      setError(null)
      return true
    } catch (err) {
      setError(err.message)
      return false
    }
  }, [])

  // Save market data
  const saveMarketData = useCallback((data) => {
    setMarketData(data)
    storageService.saveMarketData(data)
  }, [])

  // Run market analysis
  const runAnalysis = useCallback(async (data) => {
    if (!isApiConfigured) {
      setError('API not configured. Please set your Gemini API key in Settings.')
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      const analysis = await geminiService.analyzeMarket(data)
      setLastAnalysis(analysis)
      storageService.saveLastAnalysis(analysis)
      return analysis
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [isApiConfigured])

  // Accept trade and add to active trades
  const acceptTrade = useCallback((analysis, entryData) => {
    const trade = {
      entryDate: entryData.date || new Date().toISOString().split('T')[0],
      entrySpot: entryData.spotPrice,
      verdict: analysis.verdict,
      confidence: analysis.confidence,
      strategy: analysis.strategy,
      alerts: analysis.alerts,
      analysis: analysis.analysis
    }

    const newTrade = storageService.addActiveTrade(trade)
    setActiveTrades(prev => [...prev, newTrade])
    return newTrade
  }, [])

  // Update active trade
  const updateTrade = useCallback((tradeId, updates) => {
    const updatedTrade = storageService.updateActiveTrade(tradeId, updates)
    if (updatedTrade) {
      setActiveTrades(prev => 
        prev.map(t => t.id === tradeId ? updatedTrade : t)
      )
    }
    return updatedTrade
  }, [])

  // Close trade
  const closeTrade = useCallback((tradeId, closeData) => {
    const closedTrade = storageService.closeTrade(tradeId, closeData)
    if (closedTrade) {
      setActiveTrades(prev => prev.filter(t => t.id !== tradeId))
      setTradeHistory(prev => [closedTrade, ...prev])
    }
    return closedTrade
  }, [])

  // Run 3:15 PM routine
  const runRoutine = useCallback(async (trade, currentData) => {
    if (!isApiConfigured) {
      setError('API not configured. Please set your Gemini API key in Settings.')
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await geminiService.runRoutineCheck(trade, currentData)
      
      // Update trade with routine result
      updateTrade(trade.id, {
        lastRoutineCheck: new Date().toISOString(),
        lastRoutineResult: result,
        updateNote: `3:15 PM Check: ${result.recommendation} - ${result.summary}`
      })

      return result
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [isApiConfigured, updateTrade])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Calculate portfolio stats
  const getPortfolioStats = useCallback(() => {
    const history = tradeHistory
    const totalTrades = history.length
    const wins = history.filter(t => t.result === 'PROFIT').length
    const losses = history.filter(t => t.result === 'LOSS').length
    const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : 0
    const totalPnL = history.reduce((sum, t) => sum + (t.realizedPnL || 0), 0)

    return {
      totalTrades,
      wins,
      losses,
      winRate,
      totalPnL,
      activeTrades: activeTrades.length
    }
  }, [tradeHistory, activeTrades])

  const value = {
    // State
    isApiConfigured,
    activeTrades,
    tradeHistory,
    lastAnalysis,
    marketData,
    isLoading,
    error,
    
    // Actions
    configureApi,
    saveMarketData,
    runAnalysis,
    acceptTrade,
    updateTrade,
    closeTrade,
    runRoutine,
    clearError,
    getPortfolioStats
  }

  return (
    <TradeContext.Provider value={value}>
      {children}
    </TradeContext.Provider>
  )
}

export function useTrade() {
  const context = useContext(TradeContext)
  if (!context) {
    throw new Error('useTrade must be used within a TradeProvider')
  }
  return context
}

export default TradeContext

