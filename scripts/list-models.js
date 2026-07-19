const fs = require('fs');
const path = require('path');

// Load API key: prioritize local .env file first
let apiKey = '';

try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/NEXT_PUBLIC_AI_API_KEY\s*=\s*(.*)/);
    if (match && match[1]) {
      apiKey = match[1].trim();
    }
  }
} catch (err) {
  // Ignore error and fall through
}

if (!apiKey) {
  apiKey = process.env.NEXT_PUBLIC_AI_API_KEY || process.env.GEMINI_API_KEY;
}

if (!apiKey) {
  console.error('Error: Could not find NEXT_PUBLIC_AI_API_KEY in .env or environment variables.');
  process.exit(1);
}

async function listModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  console.log(`Fetching models using API key ending in: ...${apiKey.slice(-6)}`);
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok) {
      console.log('Available models for your API Key:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.error('API Error:', data);
    }
  } catch (error) {
    console.error('Fetch failed:', error.message);
  }
}

listModels();
