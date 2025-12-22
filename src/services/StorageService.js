/**
 * StorageService - Handles all localStorage operations for the Lifestyle Trader app
 */

const STORAGE_KEYS = {
  API_KEY: 'lt_gemini_api_key',
  ACTIVE_TRADES: 'lt_active_trades',
  TRADE_HISTORY: 'lt_trade_history',
  MARKET_DATA: 'lt_market_data',
  SETTINGS: 'lt_settings',
  LAST_ANALYSIS: 'lt_last_analysis'
}

class StorageService {
  /**
   * Save the Gemini API key (encrypted in a simple way for basic protection)
   */
  saveApiKey(apiKey) {
    try {
      // Simple base64 encoding - not true encryption but prevents casual viewing
      const encoded = btoa(apiKey)
      localStorage.setItem(STORAGE_KEYS.API_KEY, encoded)
      return true
    } catch (error) {
      console.error('Failed to save API key:', error)
      return false
    }
  }

  /**
   * Retrieve the Gemini API key
   */
  getApiKey() {
    try {
      const encoded = localStorage.getItem(STORAGE_KEYS.API_KEY)
      if (!encoded) return null
      return atob(encoded)
    } catch (error) {
      console.error('Failed to retrieve API key:', error)
      return null
    }
  }

  /**
   * Remove the API key
   */
  removeApiKey() {
    localStorage.removeItem(STORAGE_KEYS.API_KEY)
  }

  /**
   * Save active trades
   */
  saveActiveTrades(trades) {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_TRADES, JSON.stringify(trades))
      return true
    } catch (error) {
      console.error('Failed to save active trades:', error)
      return false
    }
  }

  /**
   * Get active trades
   */
  getActiveTrades() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_TRADES)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('Failed to retrieve active trades:', error)
      return []
    }
  }

  /**
   * Add a new active trade
   */
  addActiveTrade(trade) {
    const trades = this.getActiveTrades()
    const newTrade = {
      ...trade,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      status: 'ACTIVE',
      updates: []
    }
    trades.push(newTrade)
    this.saveActiveTrades(trades)
    return newTrade
  }

  /**
   * Update an active trade
   */
  updateActiveTrade(tradeId, updates) {
    const trades = this.getActiveTrades()
    const index = trades.findIndex(t => t.id === tradeId)
    if (index === -1) return null

    trades[index] = {
      ...trades[index],
      ...updates,
      updatedAt: new Date().toISOString()
    }
    
    // Add to update history
    if (updates.updateNote) {
      trades[index].updates.push({
        date: new Date().toISOString(),
        note: updates.updateNote,
        spotPrice: updates.currentSpot
      })
    }

    this.saveActiveTrades(trades)
    return trades[index]
  }

  /**
   * Close a trade and move to history
   */
  closeTrade(tradeId, closeData) {
    const trades = this.getActiveTrades()
    const trade = trades.find(t => t.id === tradeId)
    if (!trade) return null

    // Add to history
    const closedTrade = {
      ...trade,
      status: 'CLOSED',
      closedAt: new Date().toISOString(),
      closeReason: closeData.reason,
      exitSpot: closeData.exitSpot,
      exitPremium: closeData.exitPremium,
      realizedPnL: closeData.realizedPnL,
      result: closeData.realizedPnL >= 0 ? 'PROFIT' : 'LOSS'
    }

    const history = this.getTradeHistory()
    history.unshift(closedTrade)
    localStorage.setItem(STORAGE_KEYS.TRADE_HISTORY, JSON.stringify(history))

    // Remove from active trades
    const updatedTrades = trades.filter(t => t.id !== tradeId)
    this.saveActiveTrades(updatedTrades)

    return closedTrade
  }

  /**
   * Get trade history
   */
  getTradeHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRADE_HISTORY)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('Failed to retrieve trade history:', error)
      return []
    }
  }

  /**
   * Save market data
   */
  saveMarketData(data) {
    try {
      localStorage.setItem(STORAGE_KEYS.MARKET_DATA, JSON.stringify(data))
      return true
    } catch (error) {
      console.error('Failed to save market data:', error)
      return false
    }
  }

  /**
   * Get saved market data
   */
  getMarketData() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MARKET_DATA)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('Failed to retrieve market data:', error)
      return null
    }
  }

  /**
   * Save last analysis result
   */
  saveLastAnalysis(analysis) {
    try {
      const data = {
        ...analysis,
        timestamp: new Date().toISOString()
      }
      localStorage.setItem(STORAGE_KEYS.LAST_ANALYSIS, JSON.stringify(data))
      return true
    } catch (error) {
      console.error('Failed to save analysis:', error)
      return false
    }
  }

  /**
   * Get last analysis
   */
  getLastAnalysis() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LAST_ANALYSIS)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('Failed to retrieve analysis:', error)
      return null
    }
  }

  /**
   * Save app settings
   */
  saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings))
      return true
    } catch (error) {
      console.error('Failed to save settings:', error)
      return false
    }
  }

  /**
   * Get app settings
   */
  getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS)
      return data ? JSON.parse(data) : {
        defaultExpiry: 'weekly',
        riskPerTrade: 2,
        notificationsEnabled: true,
        theme: 'dark'
      }
    } catch (error) {
      console.error('Failed to retrieve settings:', error)
      return {}
    }
  }

  /**
   * Clear all data
   */
  clearAll() {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
  }

  /**
   * Export all data as JSON
   */
  exportData() {
    const data = {
      activeTrades: this.getActiveTrades(),
      tradeHistory: this.getTradeHistory(),
      marketData: this.getMarketData(),
      lastAnalysis: this.getLastAnalysis(),
      settings: this.getSettings(),
      exportedAt: new Date().toISOString()
    }
    return JSON.stringify(data, null, 2)
  }

  /**
   * Import data from JSON
   */
  importData(jsonString) {
    try {
      const data = JSON.parse(jsonString)
      
      if (data.activeTrades) this.saveActiveTrades(data.activeTrades)
      if (data.tradeHistory) localStorage.setItem(STORAGE_KEYS.TRADE_HISTORY, JSON.stringify(data.tradeHistory))
      if (data.marketData) this.saveMarketData(data.marketData)
      if (data.settings) this.saveSettings(data.settings)
      
      return true
    } catch (error) {
      console.error('Failed to import data:', error)
      return false
    }
  }
}

const storageService = new StorageService()
export default storageService

