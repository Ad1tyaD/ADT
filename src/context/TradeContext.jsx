import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import storageService from '../services/StorageService'
import geminiService from '../services/GeminiService'
import firebaseService from '../services/FirebaseService'

const TradeContext = createContext(null)

export function TradeProvider({ children }) {
  // State
  const [user, setUser] = useState(null)
  const [isApiConfigured, setIsApiConfigured] = useState(false)
  const [activeTrades, setActiveTrades] = useState([])
  const [tradeHistory, setTradeHistory] = useState([])
  const [lastAnalysis, setLastAnalysis] = useState(null)
  const [marketData, setMarketData] = useState({ nifty: null, banknifty: null })
  const [currentInstrument, setCurrentInstrument] = useState('NIFTY')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Initialize auth state listener
  useEffect(() => {
    const unsubscribe = firebaseService.onAuthStateChange((authUser) => {
      setUser(authUser)
      if (authUser) {
        loadUserData(authUser.uid)
      } else {
        // Clear data on logout
        setActiveTrades([])
        setTradeHistory([])
        setMarketData({ nifty: null, banknifty: null })
      }
    })

    return () => unsubscribe()
  }, [])

  // Load API key from Firestore when user logs in
  useEffect(() => {
    if (user) {
      loadApiKey(user.uid)
    } else {
      setIsApiConfigured(false)
    }
  }, [user])

  // Load API key from Firestore
  const loadApiKey = async (userId) => {
    try {
      const result = await firebaseService.getApiKey(userId)
      if (result.success && result.apiKey) {
        try {
          geminiService.initialize(result.apiKey)
          setIsApiConfigured(true)
        } catch (err) {
          console.error('Failed to initialize Gemini:', err)
          setIsApiConfigured(false)
        }
      } else {
        // Fallback to localStorage for backward compatibility
        const localKey = storageService.getApiKey()
        if (localKey) {
          try {
            geminiService.initialize(localKey)
            setIsApiConfigured(true)
            // Migrate to Firestore
            await firebaseService.saveApiKey(userId, localKey)
          } catch (err) {
            console.error('Failed to initialize Gemini:', err)
            setIsApiConfigured(false)
          }
        } else {
          setIsApiConfigured(false)
        }
      }
    } catch (err) {
      console.error('Error loading API key:', err)
      setIsApiConfigured(false)
    }
  }

  // Load user data from Firestore
  const loadUserData = async (userId) => {
    setIsLoading(true)
    try {
      // Load active trades
      const tradesResult = await firebaseService.getActiveTrades(userId)
      if (tradesResult.success) {
        setActiveTrades(tradesResult.data)
      }

      // Load trade history
      const historyResult = await firebaseService.getTradeHistory(userId)
      if (historyResult.success) {
        setTradeHistory(historyResult.data)
      }

      // Load market data for both instruments
      const niftyResult = await firebaseService.getMarketData(userId, 'NIFTY')
      const bankniftyResult = await firebaseService.getMarketData(userId, 'BANKNIFTY')
      
      setMarketData({
        nifty: niftyResult.success ? niftyResult.data : null,
        banknifty: bankniftyResult.success ? bankniftyResult.data : null
      })
    } catch (err) {
      console.error('Error loading user data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Configure API
  const configureApi = useCallback(async (apiKey) => {
    if (!user) {
      setError('Please login to save API key')
      return false
    }

    try {
      geminiService.initialize(apiKey)
      // Save to Firestore (primary)
      const result = await firebaseService.saveApiKey(user.uid, apiKey)
      if (result.success) {
        // Also save to localStorage as backup
        storageService.saveApiKey(apiKey)
        setIsApiConfigured(true)
        setError(null)
        return true
      } else {
        setError(result.error || 'Failed to save API key')
        return false
      }
    } catch (err) {
      setError(err.message)
      return false
    }
  }, [user])

  // Save market data to Firestore
  const saveMarketData = useCallback(async (instrument, data) => {
    if (!user) {
      setError('Please login to save data')
      return false
    }

    setIsLoading(true)
    try {
      const result = await firebaseService.saveMarketData(user.uid, instrument, data)
      if (result.success) {
        setMarketData(prev => ({
          ...prev,
          [instrument.toLowerCase()]: { data, updatedAt: new Date().toISOString() }
        }))
        return true
      } else {
        setError(result.error)
        return false
      }
    } catch (err) {
      setError(err.message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Get current market data
  const getCurrentMarketData = useCallback(() => {
    const key = currentInstrument.toLowerCase()
    return marketData[key]?.data || null
  }, [currentInstrument, marketData])

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
  const acceptTrade = useCallback(async (analysis, entryData) => {
    if (!user) {
      setError('Please login to save trades')
      return null
    }

    const trade = {
      entryDate: entryData.date || new Date().toISOString().split('T')[0],
      entrySpot: entryData.spotPrice,
      verdict: analysis.verdict,
      confidence: analysis.confidence,
      strategy: analysis.strategy,
      alerts: analysis.alerts,
      analysis: analysis.analysis,
      instrument: currentInstrument,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updates: []
    }

    const tradeId = Date.now().toString()
    trade.id = tradeId

    setIsLoading(true)
    try {
      const result = await firebaseService.saveActiveTrade(user.uid, trade)
      if (result.success) {
        setActiveTrades(prev => [...prev, trade])
        return trade
      } else {
        setError(result.error)
        return null
      }
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [user, currentInstrument])

  // Update active trade
  const updateTrade = useCallback(async (tradeId, updates) => {
    setIsLoading(true)
    try {
      const result = await firebaseService.updateActiveTrade(tradeId, updates)
      if (result.success) {
        setActiveTrades(prev => 
          prev.map(t => t.id === tradeId ? { ...t, ...updates } : t)
        )
        return { ...updates, id: tradeId }
      } else {
        setError(result.error)
        return null
      }
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Close trade
  const closeTrade = useCallback(async (tradeId, closeData) => {
    setIsLoading(true)
    try {
      const result = await firebaseService.closeTrade(tradeId, closeData)
      if (result.success) {
        setActiveTrades(prev => prev.filter(t => t.id !== tradeId))
        // Reload history to get updated list
        if (user) {
          const historyResult = await firebaseService.getTradeHistory(user.uid)
          if (historyResult.success) {
            setTradeHistory(historyResult.data)
          }
        }
        return true
      } else {
        setError(result.error)
        return false
      }
    } catch (err) {
      setError(err.message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [user])

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
      await updateTrade(trade.id, {
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

  // Logout
  const logout = useCallback(async () => {
    await firebaseService.signOut()
    setUser(null)
  }, [])

  const value = {
    // State
    user,
    isApiConfigured,
    activeTrades,
    tradeHistory,
    lastAnalysis,
    marketData,
    currentInstrument,
    isLoading,
    error,
    
    // Actions
    setCurrentInstrument,
    configureApi,
    saveMarketData,
    getCurrentMarketData,
    runAnalysis,
    acceptTrade,
    updateTrade,
    closeTrade,
    runRoutine,
    clearError,
    getPortfolioStats,
    logout
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
