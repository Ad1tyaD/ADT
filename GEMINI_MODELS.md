# Gemini Model Names - Troubleshooting

If you're getting a 404 error for the model name, try these alternatives:

## Available Model Names (try in order):

1. **`gemini-1.5-flash`** ✅ (Most stable - currently set)
2. **`gemini-1.5-pro`** (More capable, slower)
3. **`gemini-2.0-flash-exp`** (Experimental, newer)
4. **`gemini-pro`** (Legacy, may be deprecated)

## How to Change Model:

Edit `src/services/GeminiService.js` line 161:

```javascript
model: 'gemini-1.5-flash',  // Change this value
```

## To Find Available Models:

You can also check available models programmatically:

```javascript
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI('YOUR_API_KEY');
// List models (if API supports it)
```

Or check: https://ai.google.dev/api/models

## Current Status:

✅ Updated to: `gemini-1.5-flash`

If this still doesn't work, try `gemini-1.5-pro` or `gemini-pro`.

