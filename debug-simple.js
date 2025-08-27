const axios = require('axios');

async function testSimpleAPI() {
  const API_KEY = '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';
  
  try {
    console.log('Testing simple text generation...');
    
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/gpt2',
      {
        inputs: 'Hello, I am a'
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    console.log('Success! Response:', response.data);
    
  } catch (error) {
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Headers:', error.response?.headers);
  }
}

testSimpleAPI();