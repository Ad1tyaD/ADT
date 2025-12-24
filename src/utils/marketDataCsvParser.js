/**
 * Parse market data CSV and extract the most recent date's data
 * Expected CSV format with headers: Date, Open, High, Low, Close, MA ma (50,ma,0), RSI rsi (5), RSI rsi (14), MACD macd (12,26,9), Signal macd (12,26,9), macd (12,26,9)_hist, MA ma (10,ma,0)
 */

export function parseMarketDataCSV(csvString) {
  try {
    if (!csvString || !csvString.trim()) {
      throw new Error('CSV data is empty')
    }

    // Split into lines
    const lines = csvString.trim().split(/\r?\n/)
    
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row')
    }

    // Parse header row (remove quotes)
    const headers = lines[0]
      .split(',')
      .map(h => h.trim().replace(/^"|"$/g, ''))
      .map(h => h.trim())

    // Find column indices
    const dateIndex = headers.findIndex(h => h.toLowerCase().includes('date'))
    const openIndex = headers.findIndex(h => h.toLowerCase() === 'open')
    const highIndex = headers.findIndex(h => h.toLowerCase() === 'high')
    const lowIndex = headers.findIndex(h => h.toLowerCase() === 'low')
    const closeIndex = headers.findIndex(h => h.toLowerCase() === 'close')
    const dma50Index = headers.findIndex(h => h.includes('MA') && h.includes('50'))
    const dma10Index = headers.findIndex(h => h.includes('MA') && h.includes('10') && !h.includes('50'))
    const rsi14Index = headers.findIndex(h => h.includes('RSI') && h.includes('14'))
    const macdValueIndex = headers.findIndex(h => h.includes('MACD') && h.includes('macd') && !h.includes('Signal') && !h.includes('hist'))
    const macdSignalIndex = headers.findIndex(h => h.includes('Signal') && h.includes('macd'))
    const macdHistIndex = headers.findIndex(h => h.includes('macd') && h.includes('hist'))

    if (dateIndex === -1) {
      throw new Error('Date column not found in CSV')
    }

    // Parse all data rows and find the most recent date
    const dataRows = []
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      // Parse CSV row (handle quoted values)
      const values = parseCSVLine(line)
      
      if (values.length < headers.length) {
        console.warn(`Row ${i} has fewer columns than headers, skipping`)
        continue
      }

      const dateStr = values[dateIndex]?.replace(/^"|"$/g, '').trim()
      if (!dateStr) continue

      try {
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) {
          console.warn(`Invalid date in row ${i}: ${dateStr}`)
          continue
        }

        dataRows.push({
          date,
          dateStr,
          values,
          rowIndex: i
        })
      } catch (err) {
        console.warn(`Error parsing date in row ${i}: ${err.message}`)
        continue
      }
    }

    if (dataRows.length === 0) {
      throw new Error('No valid data rows found in CSV')
    }

    // Sort by date descending and get the most recent
    dataRows.sort((a, b) => b.date - a.date)
    const latest = dataRows[0]

    // Extract values
    const getValue = (index, defaultValue = 0) => {
      if (index === -1) return defaultValue
      const val = latest.values[index]?.replace(/^"|"$/g, '').trim()
      return val ? parseFloat(val) : defaultValue
    }

    const parsed = {
      date: formatDate(latest.dateStr),
      spot: {
        open: getValue(openIndex),
        high: getValue(highIndex),
        low: getValue(lowIndex),
        close: getValue(closeIndex)
      },
      indicators: {
        dma10: getValue(dma10Index),
        dma50: getValue(dma50Index),
        rsi: getValue(rsi14Index),
        macd: {
          value: getValue(macdValueIndex),
          signal: getValue(macdSignalIndex),
          histogram: getValue(macdHistIndex)
        }
      },
      rawData: latest.values,
      allData: dataRows.map(r => r.values)
    }

    // Validate required fields
    const errors = []
    
    if (isNaN(parsed.spot.open) || isNaN(parsed.spot.high) || 
        isNaN(parsed.spot.low) || isNaN(parsed.spot.close)) {
      errors.push('Missing or invalid OHLC data (Open, High, Low, Close)')
    }

    if (isNaN(parsed.indicators.dma10)) {
      errors.push('Missing or invalid 10 DMA')
    }

    if (isNaN(parsed.indicators.dma50)) {
      errors.push('Missing or invalid 50 DMA')
    }

    if (isNaN(parsed.indicators.rsi)) {
      errors.push('Missing or invalid RSI(14)')
    }

    if (isNaN(parsed.indicators.macd.value)) {
      errors.push('Missing or invalid MACD value')
    }

    if (isNaN(parsed.indicators.macd.signal)) {
      errors.push('Missing or invalid MACD Signal')
    }

    if (isNaN(parsed.indicators.macd.histogram)) {
      errors.push('Missing or invalid MACD Histogram')
    }

    if (errors.length > 0) {
      throw new Error(errors.join('\n'))
    }

    return { success: true, data: parsed }
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Invalid CSV format' 
    }
  }
}

/**
 * Parse a CSV line handling quoted values
 */
function parseCSVLine(line) {
  const values = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      values.push(current)
      current = ''
    } else {
      current += char
    }
  }
  
  // Add last field
  values.push(current)
  
  return values
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(dateString) {
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      // Try to extract date from string
      const match = dateString.match(/(\d{4})-(\d{2})-(\d{2})/)
      if (match) {
        return match[0]
      }
      return new Date().toISOString().split('T')[0]
    }
    return date.toISOString().split('T')[0]
  } catch (error) {
    return new Date().toISOString().split('T')[0]
  }
}

