/**
 * Parse option chain CSV file and clean/format it
 * Handles merged columns and various CSV formats
 */

export function parseOptionChainCSV(csvString) {
  try {
    if (!csvString || !csvString.trim()) {
      throw new Error('CSV data is empty')
    }

    const lines = csvString.trim().split(/\r?\n/)
    
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row')
    }

    // Parse header to understand structure
    const headerLine = lines[0]
    const headers = parseCSVLine(headerLine)
    
    // Detect if we have merged columns (CALLS and PUTS sections)
    const hasMergedColumns = headers.some(h => h.includes('CALL') && headers.some(h2 => h2.includes('PUT')))
    
    // Find key column indices
    const strikeIndex = headers.findIndex(h => 
      h.toLowerCase().includes('strike') || 
      h.toLowerCase() === 'strike'
    )
    
    // For CALLS
    const callOIIndex = headers.findIndex(h => 
      (h.toLowerCase().includes('call') && h.toLowerCase().includes('oi')) ||
      h.toLowerCase() === 'call_oi' ||
      h.toLowerCase() === 'calloi'
    )
    const callLTPIndex = headers.findIndex(h => 
      (h.toLowerCase().includes('call') && h.toLowerCase().includes('ltp')) ||
      h.toLowerCase() === 'call_ltp' ||
      h.toLowerCase() === 'callltp'
    )
    
    // For PUTS
    const putOIIndex = headers.findIndex(h => 
      (h.toLowerCase().includes('put') && h.toLowerCase().includes('oi')) ||
      h.toLowerCase() === 'put_oi' ||
      h.toLowerCase() === 'putoi'
    )
    const putLTPIndex = headers.findIndex(h => 
      (h.toLowerCase().includes('put') && h.toLowerCase().includes('ltp')) ||
      h.toLowerCase() === 'put_ltp' ||
      h.toLowerCase() === 'putltp'
    )

    if (strikeIndex === -1) {
      throw new Error('Strike column not found in CSV')
    }

    // Parse data rows
    const cleanedRows = []
    const headerRow = ['Strike', 'CallOI', 'CallLTP', 'PutOI', 'PutLTP']
    cleanedRows.push(headerRow.join(','))

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = parseCSVLine(line)
      
      if (values.length < Math.max(strikeIndex, callOIIndex, callLTPIndex, putOIIndex, putLTPIndex) + 1) {
        continue // Skip incomplete rows
      }

      // Extract values (remove quotes and clean)
      const getValue = (index) => {
        if (index === -1) return '0'
        const val = values[index]?.replace(/^"|"$/g, '').trim()
        // Handle empty values
        if (!val || val === '' || val === '-' || val === 'N/A') return '0'
        // Remove commas from numbers
        return val.replace(/,/g, '')
      }

      const strike = getValue(strikeIndex)
      const callOI = getValue(callOIIndex)
      const callLTP = getValue(callLTPIndex)
      const putOI = getValue(putOIIndex)
      const putLTP = getValue(putLTPIndex)

      // Only add rows with valid strike
      if (strike && strike !== '0' && !isNaN(parseFloat(strike))) {
        cleanedRows.push([strike, callOI, callLTP, putOI, putLTP].join(','))
      }
    }

    if (cleanedRows.length <= 1) {
      throw new Error('No valid option chain data found in CSV')
    }

    return {
      success: true,
      data: cleanedRows.join('\n'),
      rowCount: cleanedRows.length - 1 // Exclude header
    }
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to parse option chain CSV'
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

