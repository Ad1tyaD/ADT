/**
 * Utility to list available Gemini models
 * Run this in browser console to see what models are available
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

export async function listAvailableModels(apiKey) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    
    // Try to get model info
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    
    // Common model names to try
    const modelsToTry = [
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-2.0-flash-exp',
      'gemini-pro',
      'gemini-1.0-pro',
      'gemini-1.5-flash-001',
      'gemini-1.5-pro-001'
    ]
    
    console.log('Testing available models...')
    
    for (const modelName of modelsToTry) {
      try {
        const testModel = genAI.getGenerativeModel({ model: modelName })
        const result = await testModel.generateContent('test')
        console.log(`✅ ${modelName} - WORKS!`)
        return modelName
      } catch (err) {
        console.log(`❌ ${modelName} - ${err.message}`)
      }
    }
    
    return null
  } catch (error) {
    console.error('Error listing models:', error)
    return null
  }
}

