# 🤖 **AI Integration Guide - Gemini, Groq, NVIDIA & More**

## **Overview**

Your Tender Automation app now supports **multiple AI providers** for enhanced document generation. The system can use:
- ✅ **Google Gemini** (free tier available)
- ✅ **OpenAI** (GPT-3.5, GPT-4)
- ✅ **Groq** (fast Llama models)
- ✅ **NVIDIA NIM** (open source models)
- ✅ **Mock** (development mode, no API key needed)

## **Current State**

### **Before (Mock AI)**
```
App → simulateAIDraftHTML() → Mock response
No real AI, just templates
```

### **After (Real AI Integration)**
```
App → generateAIDraft() → AI Provider → Real response
Supports Gemini, OpenAI, Groq, NVIDIA
```

## **Setup Instructions**

### **Step 1: Choose Your AI Provider**

| Provider | Free Tier | Best For | API Key Required |
|----------|-----------|----------|------------------|
| **Gemini** | ✅ Yes | General use | ✅ Yes |
| **OpenAI** | ❌ No | High quality | ✅ Yes |
| **Groq** | ✅ Yes | Fast generation | ✅ Yes |
| **NVIDIA** | ✅ Yes | Open source | ✅ Yes |
| **Mock** | ✅ Yes | Development | ❌ No |

### **Step 2: Get API Key**

#### **Gemini:**
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the key

#### **OpenAI:**
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create account
3. Click "Create new secret key"
4. Copy the key

#### **Groq:**
1. Go to [Groq Console](https://console.groq.com/keys)
2. Sign in or create account
3. Click "Create API Key"
4. Copy the key

#### **NVIDIA:**
1. Go to [NVIDIA NGC](https://org.ngc.nvidia.com/setup/api-keys)
2. Sign in or create account
3. Create API key
4. Copy the key

### **Step 3: Update .env File**

```bash
# Edit .env file
NEXT_PUBLIC_AI_PROVIDER=gemini  # or openai, groq, nvidia, mock
NEXT_PUBLIC_AI_API_KEY=your_api_key_here
NEXT_PUBLIC_AI_MODEL=gemini-1.5-flash  # or your preferred model
```

### **Step 4: Install Dependencies**

```bash
npm install @google/generative-ai openai groq-sdk
```

## **Configuration Options**

### **Available Providers:**

```typescript
type AIProvider = 'gemini' | 'openai' | 'groq' | 'nvidia' | 'mock';
```

### **Default Models:**

| Provider | Default Model | Cost |
|----------|---------------|------|
| Gemini | gemini-1.5-flash | Free tier |
| OpenAI | gpt-3.5-turbo | Paid |
| Groq | llama3-70b-8192 | Free tier |
| NVIDIA | meta/llama3-70b | Free tier |
| Mock | mock-1.0 | Free |

### **Example Configurations:**

#### **Gemini (Recommended for Free Tier):**
```bash
NEXT_PUBLIC_AI_PROVIDER=gemini
NEXT_PUBLIC_AI_API_KEY=AIzaSy...
NEXT_PUBLIC_AI_MODEL=gemini-1.5-flash
```

#### **Groq (Recommended for Speed):**
```bash
NEXT_PUBLIC_AI_PROVIDER=groq
NEXT_PUBLIC_AI_API_KEY=gsk_...
NEXT_PUBLIC_AI_MODEL=llama3-70b-8192
```

#### **NVIDIA (Recommended for Open Source):**
```bash
NEXT_PUBLIC_AI_PROVIDER=nvidia
NEXT_PUBLIC_AI_API_KEY=nvapi-...
NEXT_PUBLIC_AI_MODEL=meta/llama3-70b
```

## **How It Works**

### **Document Generation Flow:**

```
1. User clicks "Generate Document"
   ↓
2. documentService.generateAndPersistDocument()
   ↓
3. aiDraftService.generateDraft()
   ↓
4. buildPromptStack() - Create prompt
   ↓
5. generateAIDraft() - Call AI provider
   ↓
6. AI returns HTML content
   ↓
7. layoutEngine.applyLetterheadLayoutPages()
   ↓
8. Document saved to Firestore
```

### **Prompt Building:**

```typescript
// System prompt (always same)
"You write procurement documents in structured HTML..."

// Style profile (firm-specific)
"Use strict official structure, numbered sections..."

// Document type
"Generate a quotation for the main firm."

// Firm instructions (optional)
"Follow these formatting rules..."
```

## **Provider Comparison**

### **Gemini (Google)**
- ✅ Free tier (15 RPM, 1M tokens/day)
- ✅ Strong in Indian languages
- ✅ Good for government documents
- ❌ Rate limits on free tier

### **Groq**
- ✅ Free tier (very generous)
- ✅ Extremely fast (Llama 3)
- ✅ Good for quick drafts
- ❌ Limited model selection

### **NVIDIA**
- ✅ Free tier (open source models)
- ✅ Access to Llama, Mistral, etc.
- ✅ No vendor lock-in
- ❌ API slightly more complex

### **OpenAI**
- ❌ No free tier
- ✅ Highest quality
- ✅ Best for complex documents
- ❌ Most expensive

### **Mock**
- ✅ No API key needed
- ✅ Perfect for development
- ❌ Not real AI
- ❌ Just templates

## **Testing Your Setup**

### **Test 1: Check Provider**

```bash
# In browser console
console.log(process.env.NEXT_PUBLIC_AI_PROVIDER)
// Should show: gemini, openai, groq, nvidia, or mock
```

### **Test 2: Generate Document**

1. Go to `/manage-firms`
2. Create a firm with AI instructions
3. Go to `/tenders/[id]`
4. Click "Generate Document"
5. Check browser console for AI logs

### **Test 3: Verify AI Response**

```typescript
// Check console for:
// "Using AI provider: gemini"
// "Model: gemini-1.5-flash"
// "Tokens used: 1234"
```

## **Troubleshooting**

### **Error: "API key not found"**

**Solution:**
```bash
# Check .env file
NEXT_PUBLIC_AI_API_KEY=your_actual_key

# Restart dev server
npm run dev
```

### **Error: "Invalid API key"**

**Solution:**
1. Verify API key is correct
2. Check API key hasn't expired
3. Ensure API key has correct permissions

### **Error: "Rate limit exceeded"**

**Solution:**
1. Wait for rate limit to reset
2. Upgrade to paid tier
3. Use a different provider

### **Error: "Model not found"**

**Solution:**
```bash
# Check model name is correct
NEXT_PUBLIC_AI_MODEL=gemini-1.5-flash  # Not gemini-flash
```

## **Cost Estimation**

### **Free Tier (Gemini/Groq/NVIDIA):**
- **100 tenders/month**: ~$0
- **1000 tenders/month**: ~$0
- **10000 tenders/month**: ~$0-5

### **Paid Tier (OpenAI):**
- **100 tenders/month**: ~$5-10
- **1000 tenders/month**: ~$50-100
- **10000 tenders/month**: ~$500-1000

## **Best Practices**

### **1. Use Mock for Development**
```bash
NEXT_PUBLIC_AI_PROVIDER=mock
```

### **2. Use Gemini for Production (Free)**
```bash
NEXT_PUBLIC_AI_PROVIDER=gemini
NEXT_PUBLIC_AI_MODEL=gemini-1.5-flash
```

### **3. Use Groq for Speed**
```bash
NEXT_PUBLIC_AI_PROVIDER=groq
NEXT_PUBLIC_AI_MODEL=llama3-70b-8192
```

### **4. Set AI Instructions per Firm**
```typescript
// In firm settings
aiPromptQuotation: "Use formal government language"
aiPromptBill: "Include tax breakdown and payment terms"
```

## **Files Modified**

1. `services/aiClient.ts` - NEW - AI provider integration
2. `.env` - Updated with AI configuration
3. `.env.example` - Updated with AI configuration

## **Next Steps**

1. ✅ Choose your AI provider
2. ✅ Get API key
3. ✅ Update .env file
4. ✅ Install dependencies
5. ✅ Test document generation
6. ✅ Monitor token usage

## **Support**

For issues:
1. Check API key is correct
2. Verify provider is available
3. Check rate limits
4. Review error logs in console
