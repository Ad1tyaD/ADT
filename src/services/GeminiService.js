import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * Fix common JSON issues
 */
function fixJsonString(jsonString) {
  let fixed = jsonString
  
  // Remove trailing commas before closing braces/brackets
  fixed = fixed.replace(/,(\s*[}\]])/g, '$1')
  
  // Fix unescaped newlines in strings
  fixed = fixed.replace(/("(?:[^"\\]|\\.)*")\s*\n\s*(")/g, '$1 $2')
  
  // Fix unescaped quotes in string values (but not in keys)
  fixed = fixed.replace(/:\s*"([^"]*)"([^,}\]]*)"([^,}\]]*)/g, (match, p1, p2, p3) => {
    // Only fix if it looks like an unterminated string
    if (p2 && !p2.match(/^[,\s}]*$/)) {
      return `: "${p1}${p2.replace(/"/g, "'")}${p3.replace(/"/g, "'")}"`
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
 * Extract basic JSON structure even if parsing fails
 */
function extractBasicJson(malformedJson) {
  // Try to extract key fields using regex
  const verdictMatch = malformedJson.match(/"verdict"\s*:\s*"([^"]+)"/)
  const confidenceMatch = malformedJson.match(/"confidence"\s*:\s*"([^"]+)"/)
  const summaryMatch = malformedJson.match(/"summary"\s*:\s*"([^"]*)"/)
  
  return {
    verdict: verdictMatch ? verdictMatch[1] : 'NEUTRAL',
    confidence: confidenceMatch ? confidenceMatch[1] : 'MEDIUM',
    summary: summaryMatch ? summaryMatch[1] : 'Analysis completed but response format was invalid. Please try again.',
    analysis: {
      trend: 'Unable to parse',
      momentum: 'Unable to parse',
      pcr: 1.0,
      pcrInterpretation: 'Unable to calculate',
      maxPain: 0,
      keyLevels: { support: 0, resistance: 0 }
    },
    strategy: {
      name: 'Unable to determine',
      type: 'DEBIT',
      legs: [],
      netPremium: 0,
      maxProfit: 0,
      maxLoss: 0,
      riskReward: '1:1',
      breakeven: 0,
      rationale: 'Unable to parse strategy'
    },
    alerts: {
      warning: { level: 0, description: 'Unable to determine' },
      abort: { level: 0, description: 'Unable to determine' },
      profitBooking: { level: 0, description: 'Unable to determine' }
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
        maxOutputTokens: 4096,
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
      
      // Fix common JSON issues before parsing
      cleanedText = fixJsonString(cleanedText)
      
      try {
        return JSON.parse(cleanedText)
      } catch (parseErr) {
        console.error('Failed to parse Gemini response:', parseErr)
        console.error('Response text (first 1000 chars):', cleanedText.substring(0, 1000))
        
        // Try more aggressive JSON repair
        try {
          const repaired = repairJson(cleanedText)
          return JSON.parse(repaired)
        } catch (secondErr) {
          // Last resort: try to extract just the essential fields
          try {
            return extractBasicJson(cleanedText)
          } catch (thirdErr) {
            throw new Error(`Failed to parse AI response. The AI may have returned invalid JSON. Error: ${parseErr.message}. Please try analyzing again. If this persists, the AI response format may need adjustment.`)
          }
        }
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

