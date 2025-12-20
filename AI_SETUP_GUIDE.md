# AI Question Generation Setup Guide

## Overview

This application uses AI to generate Bible quiz questions. It has a dual-service architecture:

1. **Primary Service: ChatGPT (OpenAI)** - High-quality, reliable question generation
2. **Fallback Service: Ollama** - Local AI model used when ChatGPT is unavailable

## Setup Instructions

### Step 1: Get an OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign up or log in
3. Create a new API key
4. Copy the key (it starts with `sk-`)

### Step 2: Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Open `.env.local` and add your OpenAI API key:
   ```env
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

### Step 3: (Optional) Setup Ollama Fallback

If you want to have a local fallback service:

1. Install Ollama from [ollama.ai](https://ollama.ai)
2. Pull the llama3 model:
   ```bash
   ollama pull llama3
   ```
3. Ensure Ollama is running (it runs automatically on startup)

**Note:** If you don't set up Ollama, the system will only use ChatGPT. The fallback is optional.

## How It Works

### Question Generation Flow

```
User requests quiz generation
    ↓
Try ChatGPT API
    ↓
Success? → Return questions ✓
    ↓
Failure? → Try Ollama (fallback)
    ↓
Success? → Return questions ✓
    ↓
Both failed? → Show error message
```

### Scripture Accuracy Guarantee

The system has multiple safeguards to ensure biblical accuracy:

1. **Strict Prompting**: The AI is explicitly instructed to ONLY use information from the provided passage
2. **Verification Checklists**: Built-in prompts that require the AI to verify each question against the source
3. **Passage-Only Rule**: Questions can ONLY reference the specific chapter:verse range provided
4. **No External Knowledge**: The AI is forbidden from using general biblical knowledge outside the passage

Example of what's ALLOWED vs FORBIDDEN:

✅ **ALLOWED** (if John 3:16 is provided):
- "For God so loved the _____, that he gave his only begotten Son" (answer from the text)
- Questions about what THIS verse specifically says

❌ **FORBIDDEN** (even if John 3:16 is provided):
- Questions about other verses mentioning "eternal life"
- References to other passages about God's love
- Theological interpretations not explicitly in the text

## API Costs

### ChatGPT (Primary)
- Model used: `gpt-4o-mini` (cost-effective)
- Approximate cost: $0.01-0.02 per quiz generation
- Can upgrade to `gpt-4o` for higher quality (edit `lib/ollamaQuestions.ts` line 47)

### Ollama (Fallback)
- Completely FREE - runs locally
- Requires installation and disk space (~4GB for llama3)

## Configuration Options

You can customize the AI behavior in `lib/ollamaQuestions.ts`:

```typescript
// Line 47 - Change ChatGPT model
model: 'gpt-4o-mini', // or 'gpt-4o' for better quality

// Line 56 - Adjust creativity (0.0 = deterministic, 1.0 = creative)
temperature: 0.7,

// Line 57 - Maximum response length
max_tokens: 2500,
```

## Troubleshooting

### "OPENAI_API_KEY not configured"
- Make sure `.env.local` exists
- Verify the API key is correct and starts with `sk-`
- Restart your development server after adding the key

### "ChatGPT API error (401)"
- Your API key is invalid or expired
- Get a new key from OpenAI platform

### "ChatGPT API error (429)"
- You've exceeded your API quota
- Check your usage at OpenAI platform
- The system will automatically fall back to Ollama

### "Both ChatGPT and Ollama failed"
- Check your internet connection (for ChatGPT)
- Verify Ollama is running: `ollama list`
- Check API key is valid

## Testing the Setup

To verify everything is working:

1. Start your development server
2. Navigate to the quiz creation page
3. Try creating a quiz with AI generation
4. Check the console logs to see which service was used:
   - `🤖 Attempting question generation with ChatGPT...`
   - `✅ ChatGPT generation successful`
   - OR `🦙 Attempting question generation with Ollama...` (if ChatGPT failed)

## Security Notes

- **NEVER commit `.env.local`** to version control (already in `.gitignore`)
- Keep your OpenAI API key secret
- Rotate your key if it's ever exposed
- Consider setting spending limits in your OpenAI account
