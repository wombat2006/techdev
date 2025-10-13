#!/usr/bin/env node

/**
 * Simple Translation Comparison Test (No Server Required)
 * 
 * Tests:
 * - Google Translate API
 * - DeepL API
 * - HuggingFace Inference API
 */

const axios = require('axios');

// Load environment variables
require('dotenv').config({ path: '/ai/prj/techdev/.env' });

// Test samples
const TEST_SAMPLES = {
  jaToEn: [
    {
      id: 'tech-support',
      text: 'サーバーへの接続に失敗しました。ネットワーク設定を確認してください。',
      domain: 'IT Support'
    },
    {
      id: 'api-error',
      text: 'APIキーが無効です。正しいキーを.envファイルに設定してください。',
      domain: 'Development'
    },
    {
      id: 'business',
      text: 'お客様からのお問い合わせに迅速に対応することで、顧客満足度を向上させることができます。',
      domain: 'Business'
    }
  ],
  enToJa: [
    {
      id: 'error-message',
      text: 'The database connection pool has been exhausted. Please increase the pool size or optimize your queries.',
      domain: 'IT Support'
    },
    {
      id: 'deployment',
      text: 'The deployment was successful. The new version is now live in production.',
      domain: 'Development'
    }
  ]
};

/**
 * Test Google Translate
 */
async function testGoogleTranslate(text, direction) {
  const [sourceLang, targetLang] = direction === 'ja-en' ? ['ja', 'en'] : ['en', 'ja'];
  const startTime = Date.now();

  try {
    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!apiKey) {
      return { provider: 'Google Translate', error: 'API key not found', time: 0 };
    }

    const url = 'https://translation.googleapis.com/language/translate/v2';
    const response = await axios.post(url, {
      q: text,
      source: sourceLang,
      target: targetLang,
      format: 'text'
    }, {
      params: { key: apiKey }
    });

    const executionTimeMs = Date.now() - startTime;
    const translatedText = response.data.data.translations[0].translatedText;

    return {
      provider: 'Google Translate',
      translatedText,
      time: executionTimeMs,
      cost: (text.length * 20) / 1000000
    };
  } catch (error) {
    return {
      provider: 'Google Translate',
      error: error.response?.data?.error?.message || error.message,
      time: Date.now() - startTime
    };
  }
}

/**
 * Test DeepL
 */
async function testDeepL(text, direction) {
  const [sourceLang, targetLang] = direction === 'ja-en' ? ['JA', 'EN'] : ['EN', 'JA'];
  const startTime = Date.now();

  try {
    const apiKey = process.env.DEEPL_API_KEY;
    if (!apiKey) {
      return { provider: 'DeepL', error: 'API key not found', time: 0 };
    }

    const baseUrl = apiKey.endsWith(':fx') 
      ? 'https://api-free.deepl.com/v2'
      : 'https://api.deepl.com/v2';

    const response = await axios.post(`${baseUrl}/translate`, null, {
      params: {
        auth_key: apiKey,
        text: text,
        source_lang: sourceLang,
        target_lang: targetLang
      }
    });

    const executionTimeMs = Date.now() - startTime;
    const translatedText = response.data.translations[0].text;

    return {
      provider: 'DeepL',
      translatedText,
      time: executionTimeMs,
      cost: (text.length * 25) / 1000000
    };
  } catch (error) {
    return {
      provider: 'DeepL',
      error: error.response?.data?.message || error.message,
      time: Date.now() - startTime
    };
  }
}

/**
 * Test HuggingFace
 */
async function testHuggingFace(text, direction) {
  const model = direction === 'ja-en' 
    ? 'Helsinki-NLP/opus-mt-ja-en'
    : 'Helsinki-NLP/opus-mt-en-ja';
  
  const startTime = Date.now();

  try {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      return { provider: 'HuggingFace', error: 'API key not found', time: 0 };
    }

    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${model}`,
      { inputs: text },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const executionTimeMs = Date.now() - startTime;
    
    // Handle different response formats
    let translatedText;
    if (Array.isArray(response.data) && response.data[0]?.translation_text) {
      translatedText = response.data[0].translation_text;
    } else if (response.data?.generated_text) {
      translatedText = response.data.generated_text;
    } else {
      throw new Error('Unexpected response format');
    }

    return {
      provider: 'HuggingFace',
      translatedText,
      time: executionTimeMs,
      cost: 0.0 // Free
    };
  } catch (error) {
    return {
      provider: 'HuggingFace',
      error: error.response?.data?.error || error.message,
      time: Date.now() - startTime
    };
  }
}

/**
 * Display result
 */
function displayResult(result) {
  if (result.error) {
    console.log(`   ❌ ${result.provider}: ERROR - ${result.error}`);
  } else {
    console.log(`   ✅ ${result.provider}:`);
    console.log(`      ${result.translatedText}`);
    console.log(`      Time: ${result.time}ms | Cost: $${result.cost.toFixed(6)}`);
  }
}

/**
 * Main test function
 */
async function runTranslationTest() {
  console.log('🧪 Translation Service Comparison Test\n');
  console.log('='.repeat(80));

  // Test Japanese to English
  console.log('\n📝 Japanese → English Translation\n');
  for (const sample of TEST_SAMPLES.jaToEn) {
    console.log(`\n🔍 Sample: ${sample.id} (${sample.domain})`);
    console.log(`   Original: ${sample.text}\n`);

    const googleResult = await testGoogleTranslate(sample.text, 'ja-en');
    displayResult(googleResult);

    const deeplResult = await testDeepL(sample.text, 'ja-en');
    displayResult(deeplResult);

    const hfResult = await testHuggingFace(sample.text, 'ja-en');
    displayResult(hfResult);
  }

  // Test English to Japanese
  console.log('\n' + '='.repeat(80));
  console.log('\n📝 English → Japanese Translation\n');
  for (const sample of TEST_SAMPLES.enToJa) {
    console.log(`\n🔍 Sample: ${sample.id} (${sample.domain})`);
    console.log(`   Original: ${sample.text}\n`);

    const googleResult = await testGoogleTranslate(sample.text, 'en-ja');
    displayResult(googleResult);

    const deeplResult = await testDeepL(sample.text, 'en-ja');
    displayResult(deeplResult);

    const hfResult = await testHuggingFace(sample.text, 'en-ja');
    displayResult(hfResult);
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Translation comparison test completed!');
}

// Run the test
runTranslationTest().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
