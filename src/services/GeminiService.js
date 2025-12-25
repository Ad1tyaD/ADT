import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * Fix common JSON issues (minimal approach)
 */
function fixJsonString(jsonString) {
  let fixed = jsonString
  
  // Remove trailing commas before closing braces/brackets
  fixed = fixed.replace(/,(\s*[}\]])/g, '$1')
  
  // Fix unescaped newlines in strings (replace with space)
  fixed = fixed.replace(/: "([^"]*)\n([^"]*)"/g, ': "$1 $2"')
  
  // Fix unescaped quotes in string values - be very careful
  // Only fix obvious unterminated strings (quotes followed by comma/brace without closing quote)
  fixed = fixed.replace(/:\s*"([^"]*?)([^",}\]]*?)"([^,}\]]*?)([,}])/g, (match, p1, p2, p3, p4) => {
    // If there's content after a quote but before comma/brace, it's likely an issue
    if (p3 && p3.trim() && !p3.match(/^[\s}]*$/)) {
      // Escape the problematic content
      return `: "${p1}${p2}${p3.replace(/"/g, '\\"')}"${p4}`
    }
    return match
  })
  
  return fixed
}

/**
 * More aggressive JSON repair
 */
function repairJson(jsonString) {
  let repaired = jsonString
  
  // Find all string values and ensure they're properly closed
  const stringRegex = /"([^"\\]*(\\.[^"\\]*)*)"/g
  let lastIndex = 0
  let result = ''
  let inString = false
  let stringStart = -1
  
  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i]
    const prevChar = i > 0 ? repaired[i - 1] : ''
    
    if (char === '"' && prevChar !== '\\') {
      if (!inString) {
        inString = true
        stringStart = i
      } else {
        inString = false
        stringStart = -1
      }
    } else if (inString && (char === '\n' || char === '\r')) {
      // Replace unescaped newlines in strings with space
      repaired = repaired.substring(0, i) + ' ' + repaired.substring(i + 1)
      i-- // Adjust index
    }
  }
  
  // If we're still in a string at the end, close it
  if (inString && stringStart !== -1) {
    // Find the next comma, colon, or closing brace
    const nextBreak = repaired.indexOf(',', stringStart)
    const nextColon = repaired.indexOf(':', stringStart)
    const nextBrace = repaired.indexOf('}', stringStart)
    
    let insertPos = repaired.length
    if (nextBreak !== -1) insertPos = Math.min(insertPos, nextBreak)
    if (nextColon !== -1 && nextColon > stringStart) insertPos = Math.min(insertPos, nextColon)
    if (nextBrace !== -1) insertPos = Math.min(insertPos, nextBrace)
    
    repaired = repaired.substring(0, insertPos) + '"' + repaired.substring(insertPos)
  }
  
  return repaired
}

/**
 * Complete incomplete JSON by adding missing closing braces/quotes
 */
function completeIncompleteJson(jsonString) {
  let completed = jsonString.trim()
  
  // Count open and close braces/brackets (excluding escaped quotes)
  const openBraces = (completed.match(/{/g) || []).length
  const closeBraces = (completed.match(/}/g) || []).length
  const openBrackets = (completed.match(/\[/g) || []).length
  const closeBrackets = (completed.match(/\]/g) || []).length
  
  // Check if we're in the middle of a string (odd number of unescaped quotes)
  // Count quotes that are not escaped
  let quoteCount = 0
  for (let i = 0; i < completed.length; i++) {
    if (completed[i] === '"' && (i === 0 || completed[i - 1] !== '\\')) {
      quoteCount++
    }
  }
  const inString = quoteCount % 2 !== 0
  
  // If in a string, close it first
  if (inString && !completed.endsWith('"')) {
    // Find the last unclosed quote context
    let lastQuoteIndex = -1
    for (let i = completed.length - 1; i >= 0; i--) {
      if (completed[i] === '"' && (i === 0 || completed[i - 1] !== '\\')) {
        lastQuoteIndex = i
        break
      }
    }
    
    if (lastQuoteIndex !== -1) {
      const afterLastQuote = completed.substring(lastQuoteIndex + 1)
      // If there's content after the last quote, it's likely the string value
      if (afterLastQuote.trim() && !afterLastQuote.includes('"')) {
        completed = completed + '"'
      }
    }
  }
  
  // Add missing closing brackets
  for (let i = 0; i < openBrackets - closeBrackets; i++) {
    completed += ']'
  }
  
  // Add missing closing braces
  for (let i = 0; i < openBraces - closeBraces; i++) {
    // Clean up trailing whitespace and ensure proper comma placement
    completed = completed.trim()
    // Remove trailing comma if present (we'll add it back if needed)
    if (completed.endsWith(',')) {
      completed = completed.slice(0, -1).trim()
    }
    // Only add comma if we're not at a structural boundary
    if (!completed.endsWith('{') && !completed.endsWith('[') && !completed.endsWith(':')) {
      // Check if last character is part of a value
      const lastChar = completed[completed.length - 1]
      if (lastChar !== '"' && lastChar !== '}' && lastChar !== ']' && lastChar !== '}') {
        // We might need a comma, but let's be conservative
      }
    }
    completed += '}'
  }
  
  return completed
}

/**
 * Extract JSON structure even if parsing fails - enhanced to extract all fields
 */
function extractBasicJson(malformedJson) {
  // Helper to extract string values (handles incomplete strings)
  const extractString = (key) => {
    // Try to find the key and extract its value
    const regex = new RegExp(`"${key}"\\s*:\\s*"([^"]*)"`, 'g')
    const match = regex.exec(malformedJson)
    if (match && match[1]) {
      return match[1]
    }
    
    // Try to find incomplete string (key: "value... (no closing quote)
    const incompleteRegex = new RegExp(`"${key}"\\s*:\\s*"([^"]*?)(?:"|,|\\n|$)`, 's')
    const incompleteMatch = incompleteRegex.exec(malformedJson)
    if (incompleteMatch && incompleteMatch[1]) {
      return incompleteMatch[1].trim()
    }
    
    return null
  }
  
  // Helper to extract number values
  const extractNumber = (key) => {
    const regex = new RegExp(`"${key}"\\s*:\\s*(-?\\d+\\.?\\d*)`)
    const match = regex.exec(malformedJson)
    return match ? parseFloat(match[1]) : null
  }
  
  // Note: extractNumber helper uses RegExp constructor which requires double backslashes
  // The match() calls below use regex literals which use single backslashes
  
  // Extract verdict and confidence
  const verdictMatch = malformedJson.match(/"verdict"\s*:\s*"([^"]+)"/)
  const confidenceMatch = malformedJson.match(/"confidence"\s*:\s*"([^"]+)"/)
  const summaryMatch = malformedJson.match(/"summary"\s*:\s*"([^"]*)"(?:\s*,|\s*})/)
  
  // Extract analysis fields
  const trendMatch = malformedJson.match(/"trend"\s*:\s*"([^"]*)"(?:\s*,|\s*})/)
  const momentumMatch = malformedJson.match(/"momentum"\s*:\s*"([^"]*)"(?:\s*,|\s*})/)
  
  // Handle incomplete momentum (may not have closing quote)
  let momentum = null
  if (momentumMatch) {
    momentum = momentumMatch[1]
  } else {
    // Try to extract incomplete momentum string (handles truncated responses)
    // Look for "momentum": " and capture everything until end of string or next field
    const incompleteMomentum = malformedJson.match(/"momentum"\s*:\s*"([^"]*?)(?:"|,\s*"|$)/s)
    if (incompleteMomentum && incompleteMomentum[1]) {
      momentum = incompleteMomentum[1].trim()
    } else {
      // Last resort: find everything after "momentum": " until we hit a pattern that looks like next field
      const lastResort = malformedJson.match(/"momentum"\s*:\s*"([^"]*)/s)
      if (lastResort && lastResort[1]) {
        // Remove any trailing characters that look like they're part of next field
        momentum = lastResort[1].replace(/,\s*"[^"]*"\s*:\s*.*$/, '').trim()
      }
    }
  }
  
  // Extract PCR and maxPain
  const pcrMatch = malformedJson.match(/"pcr"\s*:\s*(-?\d+\.?\d*)/)
  const maxPainMatch = malformedJson.match(/"maxPain"\s*:\s*(-?\d+\.?\d*)/)
  const pcrInterpretationMatch = malformedJson.match(/"pcrInterpretation"\s*:\s*"([^"]*)"(?:\s*,|\s*})/)
  
  // Extract key levels
  const supportMatch = malformedJson.match(/"support"\s*:\s*(-?\d+\.?\d*)/)
  const resistanceMatch = malformedJson.match(/"resistance"\s*:\s*(-?\d+\.?\d*)/)
  
  // Extract strategy fields
  const strategyNameMatch = malformedJson.match(/"name"\s*:\s*"([^"]*)"(?:\s*,|\s*})/)
  const strategyTypeMatch = malformedJson.match(/"type"\s*:\s*"([^"]+)"(?:\s*,|\s*})/)
  const maxProfitMatch = malformedJson.match(/"maxProfit"\s*:\s*(-?\d+\.?\d*)/)
  const maxLossMatch = malformedJson.match(/"maxLoss"\s*:\s*(-?\d+\.?\d*)/)
  const riskRewardMatch = malformedJson.match(/"riskReward"\s*:\s*"([^"]+)"(?:\s*,|\s*})/)
  const breakevenMatch = malformedJson.match(/"breakeven"\s*:\s*(-?\d+\.?\d*)/)
  const rationaleMatch = malformedJson.match(/"rationale"\s*:\s*"([^"]*)"(?:\s*,|\s*})/)
  
  // Extract alert levels - need to handle nested objects
  const warningLevelMatch = malformedJson.match(/"warning"\s*:\s*\{[^}]*"level"\s*:\s*(-?\d+\.?\d*)/)
  const warningDescMatch = malformedJson.match(/"warning"\s*:\s*\{[^}]*"description"\s*:\s*"([^"]*)"(?:\s*,|\s*})/)
  const abortLevelMatch = malformedJson.match(/"abort"\s*:\s*\{[^}]*"level"\s*:\s*(-?\d+\.?\d*)/)
  const abortDescMatch = malformedJson.match(/"abort"\s*:\s*\{[^}]*"description"\s*:\s*"([^"]*)"(?:\s*,|\s*})/)
  const profitLevelMatch = malformedJson.match(/"profitBooking"\s*:\s*\{[^}]*"level"\s*:\s*(-?\d+\.?\d*)/)
  const profitDescMatch = malformedJson.match(/"profitBooking"\s*:\s*\{[^}]*"description"\s*:\s*"([^"]*)"(?:\s*,|\s*})/)
  
  return {
    verdict: verdictMatch ? verdictMatch[1] : 'NEUTRAL',
    confidence: confidenceMatch ? confidenceMatch[1] : 'MEDIUM',
    summary: summaryMatch ? summaryMatch[1] : 'Analysis completed but response format was invalid. Please try again.',
    analysis: {
      trend: trendMatch ? trendMatch[1] : 'Unable to parse',
      momentum: momentum || 'Unable to parse',
      pcr: pcrMatch ? parseFloat(pcrMatch[1]) : 1.0,
      pcrInterpretation: pcrInterpretationMatch ? pcrInterpretationMatch[1] : 'Unable to calculate',
      maxPain: maxPainMatch ? parseFloat(maxPainMatch[1]) : 0,
      keyLevels: { 
        support: supportMatch ? parseFloat(supportMatch[1]) : 0, 
        resistance: resistanceMatch ? parseFloat(resistanceMatch[1]) : 0 
      }
    },
    strategy: {
      name: strategyNameMatch ? strategyNameMatch[1] : 'Unable to determine',
      type: strategyTypeMatch ? strategyTypeMatch[1] : 'DEBIT',
      legs: [], // Too complex to extract with regex
      netPremium: 0,
      maxProfit: maxProfitMatch ? parseFloat(maxProfitMatch[1]) : 0,
      maxLoss: maxLossMatch ? parseFloat(maxLossMatch[1]) : 0,
      riskReward: riskRewardMatch ? riskRewardMatch[1] : '1:1',
      breakeven: breakevenMatch ? parseFloat(breakevenMatch[1]) : 0,
      rationale: rationaleMatch ? rationaleMatch[1] : 'Unable to parse strategy'
    },
    alerts: {
      warning: { 
        level: warningLevelMatch ? parseFloat(warningLevelMatch[1]) : 0, 
        description: warningDescMatch ? warningDescMatch[1] : 'Unable to determine' 
      },
      abort: { 
        level: abortLevelMatch ? parseFloat(abortLevelMatch[1]) : 0, 
        description: abortDescMatch ? abortDescMatch[1] : 'Unable to determine' 
      },
      profitBooking: { 
        level: profitLevelMatch ? parseFloat(profitLevelMatch[1]) : 0, 
        description: profitDescMatch ? profitDescMatch[1] : 'Unable to determine' 
      }
    }
  }
}

// System prompts for different analysis modes
const SYSTEM_PROMPTS = {
  analysis: `You are a Senior Trading Mentor with 20+ years of experience in Options Trading. 
Your PRIMARY goal is Capital Preservation and High Probability setups.

## Your Analysis Framework:

### 1. Market Structure Analysis
- Compare Spot Price vs 10 DMA and 50 DMA
- Determine if price is above/below key moving averages
- Identify the current trend (uptrend, downtrend, sideways)

### 2. Momentum Check
- Analyze RSI(14): Overbought (>70), Oversold (<30), Neutral (30-70)
- Check MACD: Bullish crossover, Bearish crossover, or Divergence
- Histogram direction: Expanding or Contracting

### 3. Option Chain Analysis
- Calculate Put-Call Ratio (PCR) = Total Put OI / Total Call OI
  - PCR > 1.2: Bullish (more put writers, market support)
  - PCR < 0.8: Bearish (more call writers, resistance)
  - PCR 0.8-1.2: Neutral
- Identify Max Pain (Strike with highest combined OI)
- Note significant OI buildups for support/resistance

### 4. Your Verdict
Provide a clear verdict: BULLISH, BEARISH, or NEUTRAL with confidence level (High/Medium/Low)

### 5. Strategy Recommendation
ONLY suggest Defined Risk Strategies:
- Bull Call Spread (Bullish)
- Bear Put Spread (Bearish)  
- Bear Call Spread (Bearish)
- Bull Put Spread (Bullish)
- Iron Condor (Neutral/Range-bound)
- Iron Butterfly (Neutral/Low volatility)

NEVER suggest naked buying or selling of options.

### 6. Risk Management (CRITICAL)
For each strategy, provide:
- Entry strikes and premiums
- Max Profit potential
- Max Loss (Risk)
- Risk/Reward ratio
- Break-even point(s)

### 7. Alert Levels (MANDATORY)
Define THREE alert levels based on chart structure:
1. **WARNING (Yellow Zone)**: Key support/resistance being tested. Monitor closely.
2. **ABORT (Red Zone)**: Stop-loss level. Exit immediately if breached.
3. **PROFIT BOOKING (Green Zone)**: Target achieved. Take profits.

## Response Format
Always respond in this JSON structure:
{
  "verdict": "BULLISH" | "BEARISH" | "NEUTRAL",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "analysis": {
    "trend": "string describing trend",
    "momentum": "string describing momentum signals",
    "pcr": number,
    "pcrInterpretation": "string",
    "maxPain": number,
    "keyLevels": { "support": number, "resistance": number }
  },
  "strategy": {
    "name": "strategy name",
    "type": "CREDIT" | "DEBIT",
    "legs": [
      { "action": "BUY" | "SELL", "strike": number, "type": "CE" | "PE", "premium": number }
    ],
    "netPremium": number,
    "maxProfit": number,
    "maxLoss": number,
    "riskReward": "string like 1:2",
    "breakeven": number or [number, number],
    "rationale": "why this strategy"
  },
  "alerts": {
    "warning": { "level": number, "description": "string" },
    "abort": { "level": number, "description": "string" },
    "profitBooking": { "level": number, "description": "string" }
  },
  "summary": "2-3 sentence executive summary"
}`,

  routine: `You are a Trading Mentor conducting the 3:15 PM End-of-Day Review.

## Context
The trader has an active position. You need to evaluate whether to:
1. HOLD overnight (thesis intact, favorable conditions)
2. EXIT (take profits or cut losses)
3. ADJUST (modify position if needed)

## Your Evaluation Framework

### 1. Thesis Validation
- Is the original trade thesis still valid?
- Has price action confirmed or negated the setup?

### 2. Technical Check
- Where is price relative to entry and alert levels?
- How did the day's candle close? (Strong/Weak, Doji, etc.)
- Any concerning patterns?

### 3. Risk Assessment
- Current P&L status
- Distance to stop-loss
- Overnight gap risk

### 4. Time Decay (for options)
- Days to expiry
- Theta impact for overnight hold

## Response Format
Always respond in this JSON structure:
{
  "recommendation": "HOLD" | "EXIT" | "ADJUST",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "currentStatus": {
    "pnlPercent": number,
    "distanceToStop": number,
    "distanceToTarget": number,
    "thesisStatus": "INTACT" | "WEAKENING" | "INVALID"
  },
  "analysis": {
    "dayClose": "string describing the day's close",
    "technicalView": "string",
    "riskAssessment": "string"
  },
  "action": {
    "instruction": "specific action to take",
    "rationale": "why this action",
    "newStopLoss": number | null,
    "newTarget": number | null
  },
  "overnightRisk": "LOW" | "MEDIUM" | "HIGH",
  "summary": "2-3 sentence summary for quick decision"
}`
}

class GeminiService {
  constructor() {
    this.genAI = null
    this.model = null
  }

  /**
   * Initialize the Gemini API with the provided key
   */
  initialize(apiKey) {
    if (!apiKey) {
      throw new Error('API Key is required')
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey)
    
    // Try multiple model names - use the first one that works
    const modelsToTry = [
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-2.0-flash-exp',
      'gemini-pro',
      'gemini-1.0-pro'
    ]
    
    // Use gemini-2.5-flash (available for this API key)
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.3, // Lower for more consistent analysis
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 8192, // Increased to prevent truncation
      }
    })
    
    return true
  }

  /**
   * Check if service is initialized
   */
  isInitialized() {
    return this.model !== null
  }

  /**
   * Format market data for the prompt
   */
  formatMarketData(data) {
    const { date, spot, indicators, optionChain } = data

    // Clean and escape the option chain CSV to prevent JSON parsing issues
    let cleanOptionChain = optionChain || ''
    // Remove any potential JSON-breaking characters from CSV
    cleanOptionChain = cleanOptionChain.replace(/"/g, "'") // Replace double quotes with single quotes
    cleanOptionChain = cleanOptionChain.replace(/\n/g, ' | ') // Replace newlines with pipe separator for better readability

    return `
## Market Data for ${date}

### Spot Price (OHLC)
- Open: ${spot.open}
- High: ${spot.high}
- Low: ${spot.low}
- Close: ${spot.close}

### Technical Indicators
- 10 DMA: ${indicators.dma10}
- 50 DMA: ${indicators.dma50}
- RSI (14): ${indicators.rsi}
- MACD Value: ${indicators.macd.value}
- MACD Signal: ${indicators.macd.signal}
- MACD Histogram: ${indicators.macd.histogram}

### Option Chain Data (CSV format)
The option chain data is provided below. Please analyze the Put-Call Ratio (PCR) and identify key support/resistance levels based on Open Interest (OI) concentrations.

${cleanOptionChain}

Note: Analyze the Strike prices, Call OI, Call LTP, Put OI, and Put LTP columns to determine market sentiment and key levels.
`
  }

  /**
   * Run analysis on market data
   */
  async analyzeMarket(marketData) {
    if (!this.isInitialized()) {
      throw new Error('GeminiService not initialized. Please set API key in Settings.')
    }

    const formattedData = this.formatMarketData(marketData)
    
    const prompt = `${SYSTEM_PROMPTS.analysis}

---
${formattedData}
---

CRITICAL INSTRUCTIONS:
1. Analyze the above market data
2. Return ONLY a valid JSON object - nothing else
3. Do NOT include any explanatory text before or after the JSON
4. Do NOT include markdown code blocks (no \`\`\`json)
5. Ensure all string values are properly quoted and escaped
6. Do NOT include any CSV data or raw numbers in string fields
7. The response must start with { and end with }
8. All quotes inside string values must be escaped with \\

Return your analysis as a single, valid JSON object now:`

    try {
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const text = response.text()
      
      // Clean the response (remove potential markdown code blocks)
      let cleanedText = text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      
      // Try to extract JSON if it's wrapped in other text
      // Look for the first { and last } to extract the JSON object
      const firstBrace = cleanedText.indexOf('{')
      const lastBrace = cleanedText.lastIndexOf('}')
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleanedText = cleanedText.substring(firstBrace, lastBrace + 1)
      }
      
      // Strategy 1: Try parsing raw response first (most valid JSON should work)
      try {
        return JSON.parse(cleanedText)
      } catch (firstErr) {
        console.log('First parse attempt failed, trying repairs...')
      }
      
      // Strategy 2: Apply minimal fixes (trailing commas only)
      try {
        const minimalFix = cleanedText.replace(/,(\s*[}\]])/g, '$1')
        return JSON.parse(minimalFix)
      } catch (secondErr) {
        console.log('Minimal fix failed, trying more aggressive repairs...')
      }
      
      // Strategy 3: Apply more aggressive repairs
      try {
        const fixed = fixJsonString(cleanedText)
        return JSON.parse(fixed)
      } catch (thirdErr) {
        console.log('Standard repair failed, trying aggressive repair...')
      }
      
      // Strategy 4: Aggressive repair
      try {
        const repaired = repairJson(cleanedText)
        return JSON.parse(repaired)
      } catch (fourthErr) {
        console.log('Aggressive repair failed, trying to complete incomplete JSON...')
      }
      
      // Strategy 5: Complete incomplete JSON (handles truncated responses)
      try {
        const completed = completeIncompleteJson(cleanedText)
        return JSON.parse(completed)
      } catch (fifthErr) {
        console.log('JSON completion failed, trying extraction...')
      }
      
      // Last resort: extract fields using regex (works even with incomplete JSON)
      console.warn('All parsing attempts failed, extracting fields from incomplete JSON')
      console.warn('Response text (first 2000 chars):', cleanedText.substring(0, 2000))
      console.warn('Full response length:', cleanedText.length)
      
      try {
        return extractBasicJson(cleanedText)
      } catch (sixthErr) {
        throw new Error(`Failed to parse AI response. The AI may have returned invalid JSON. Error: ${firstErr.message}. Please try analyzing again.`)
      }
    } catch (error) {
      console.error('Gemini API Error:', error)
      throw new Error(`Analysis failed: ${error.message}`)
    }
  }

  /**
   * Run the 3:15 PM routine check
   */
  async runRoutineCheck(activeTrade, currentData) {
    if (!this.isInitialized()) {
      throw new Error('GeminiService not initialized. Please set API key in Settings.')
    }

    const prompt = `${SYSTEM_PROMPTS.routine}

---
## Active Trade Details
- Strategy: ${activeTrade.strategy.name}
- Entry Date: ${activeTrade.entryDate}
- Entry Spot: ${activeTrade.entrySpot}
- Entry Premium: ${activeTrade.strategy.netPremium}
- Legs: ${JSON.stringify(activeTrade.strategy.legs)}

## Alert Levels
- Warning: ${activeTrade.alerts.warning.level}
- Abort (Stop Loss): ${activeTrade.alerts.abort.level}
- Profit Target: ${activeTrade.alerts.profitBooking.level}

## Current Status
- Current Spot: ${currentData.currentSpot}
- Current Date: ${currentData.currentDate}
- Current Premium (if known): ${currentData.currentPremium || 'Not provided'}
- Days to Expiry: ${currentData.daysToExpiry || 'Not provided'}

## Today's OHLC (if available)
- Open: ${currentData.todayOHLC?.open || 'N/A'}
- High: ${currentData.todayOHLC?.high || 'N/A'}
- Low: ${currentData.todayOHLC?.low || 'N/A'}
- Close: ${currentData.todayOHLC?.close || 'N/A'}
---

Evaluate this position for the end-of-day decision and provide your recommendation in the specified JSON format.
IMPORTANT: Return ONLY valid JSON, no markdown formatting or code blocks.`

    try {
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const text = response.text()
      
      const cleanedText = text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      
      return JSON.parse(cleanedText)
    } catch (error) {
      console.error('Gemini API Error:', error)
      throw new Error(`Routine check failed: ${error.message}`)
    }
  }

  /**
   * Get a quick market sentiment check
   */
  async getQuickSentiment(spotPrice, pcr, rsi) {
    if (!this.isInitialized()) {
      throw new Error('GeminiService not initialized. Please set API key in Settings.')
    }

    const prompt = `Given:
- Spot Price: ${spotPrice}
- Put-Call Ratio: ${pcr}
- RSI (14): ${rsi}

Provide a one-line market sentiment and bias. Response format:
{"sentiment": "BULLISH" | "BEARISH" | "NEUTRAL", "summary": "one line description"}`

    try {
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const text = response.text()
      
      const cleanedText = text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      
      return JSON.parse(cleanedText)
    } catch (error) {
      console.error('Quick sentiment error:', error)
      return { sentiment: 'NEUTRAL', summary: 'Unable to determine sentiment' }
    }
  }
}

// Export singleton instance
const geminiService = new GeminiService()
export default geminiService

