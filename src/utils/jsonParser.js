/**
 * Parse JSON market data array and extract latest data
 * Expected format: Array of objects with Date, OHLC, and indicators
 */

export function parseMarketData(jsonString) {
  try {
    const dataArray = JSON.parse(jsonString)
    
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      throw new Error('JSON must be an array with at least one entry')
    }

    // Get the latest entry (last in array)
    const latest = dataArray[dataArray.length - 1]

    // Extract and map fields
    const parsed = {
      date: parseDate(latest.Date),
      spot: {
        open: parseFloat(latest.Open),
        high: parseFloat(latest.High),
        low: parseFloat(latest.Low),
        close: parseFloat(latest.Close)
      },
      indicators: {
        dma10: parseFloat(latest['MA_ma_(10,ma,0)']),
        dma50: parseFloat(latest['MA_ma_(50,ma,0)']),
        rsi: parseFloat(latest['RSI_rsi_(14)']),
        macd: {
          value: parseFloat(latest['MACD_macd_(12,26,9)']),
          signal: parseFloat(latest['Signal_macd_(12,26,9)']),
          histogram: parseFloat(latest['macd_(12,26,9)_hist'])
        }
      },
      rawData: latest,
      allData: dataArray
    }

    // Validate required fields
    const errors = []
    
    if (isNaN(parsed.spot.open) || isNaN(parsed.spot.high) || 
        isNaN(parsed.spot.low) || isNaN(parsed.spot.close)) {
      errors.push('Missing or invalid OHLC data (Open, High, Low, Close)')
    }

    if (isNaN(parsed.indicators.dma10)) {
      errors.push('Missing or invalid 10 DMA (MA_ma_(10,ma,0))')
    }

    if (isNaN(parsed.indicators.dma50)) {
      errors.push('Missing or invalid 50 DMA (MA_ma_(50,ma,0))')
    }

    if (isNaN(parsed.indicators.rsi)) {
      errors.push('Missing or invalid RSI(14) (RSI_rsi_(14))')
    }

    if (isNaN(parsed.indicators.macd.value)) {
      errors.push('Missing or invalid MACD value (MACD_macd_(12,26,9))')
    }

    if (isNaN(parsed.indicators.macd.signal)) {
      errors.push('Missing or invalid MACD Signal (Signal_macd_(12,26,9))')
    }

    if (isNaN(parsed.indicators.macd.histogram)) {
      errors.push('Missing or invalid MACD Histogram (macd_(12,26,9)_hist)')
    }

    if (errors.length > 0) {
      throw new Error(errors.join('\n'))
    }

    return { success: true, data: parsed }
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Invalid JSON format' 
    }
  }
}

/**
 * Parse date string to YYYY-MM-DD format
 */
function parseDate(dateString) {
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format')
    }
    return date.toISOString().split('T')[0]
  } catch (error) {
    // Fallback: try to extract date from string
    const match = dateString.match(/(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      return match[0]
    }
    return new Date().toISOString().split('T')[0]
  }
}

/**
 * Format parsed data for display
 */
export function formatForDisplay(parsedData) {
  return {
    date: parsedData.date,
    spot: {
      open: parsedData.spot.open.toFixed(2),
      high: parsedData.spot.high.toFixed(2),
      low: parsedData.spot.low.toFixed(2),
      close: parsedData.spot.close.toFixed(2)
    },
    indicators: {
      dma10: parsedData.indicators.dma10.toFixed(2),
      dma50: parsedData.indicators.dma50.toFixed(2),
      rsi: parsedData.indicators.rsi.toFixed(2),
      macd: {
        value: parsedData.indicators.macd.value.toFixed(2),
        signal: parsedData.indicators.macd.signal.toFixed(2),
        histogram: parsedData.indicators.macd.histogram.toFixed(2)
      }
    }
  }
}

