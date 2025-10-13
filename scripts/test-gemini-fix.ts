/**
 * Test Gemini Tool Fix
 *
 * Verify that Gemini no longer attempts to execute tools
 * when processing code with file references
 */

import LLMClient from '../src/services/llm-client';
import logger from '../src/utils/logger';

async function main() {
  console.log('🧪 Testing Gemini Tool Fix\n');
  console.log('━'.repeat(80));
  console.log();

  // Test case with file references that previously triggered tool execution
  const testPrompt = `
以下のコードをリファクタリングして、processOrder関数を抽出してください：

\`\`\`typescript
// src/processOrder.ts
function handleOrder(order: any) {
  const total = order.items.reduce((sum: number, item: any) => sum + item.price, 0);
  const tax = total * 0.1;
  const finalTotal = total + tax;

  console.log(\`Order total: \${finalTotal}\`);
  return finalTotal;
}
\`\`\`

抽出された関数を提供してください。
`;

  try {
    console.log('📤 Sending test prompt to Gemini 2.5 Flash...');
    console.log(`Prompt length: ${testPrompt.length} characters\n`);

    const startTime = Date.now();

    const response = await LLMClient.invoke('gemini-2.5-flash', testPrompt, {
      temperature: 0.3,
      maxTokens: 2048
    });

    const duration = Date.now() - startTime;

    console.log('✅ Response received successfully!\n');
    console.log('━'.repeat(80));
    console.log('📊 Metrics:');
    console.log(`   ⏱️  Duration: ${duration}ms`);
    console.log(`   📥 Input Tokens: ${response.inputTokens}`);
    console.log(`   📤 Output Tokens: ${response.outputTokens}`);
    console.log(`   💰 Cost: $${response.estimatedCost.toFixed(6)}`);
    console.log('━'.repeat(80));
    console.log();

    console.log('📝 Response Content:');
    console.log('━'.repeat(80));
    console.log(response.content.substring(0, 500));
    if (response.content.length > 500) {
      console.log(`\n... (${response.content.length - 500} more characters)\n`);
    }
    console.log('━'.repeat(80));
    console.log();

    // Check if response mentions file operations or tool usage
    const lowerContent = response.content.toLowerCase();
    const toolKeywords = ['read_file', 'file not found', 'error executing tool'];
    const foundToolUsage = toolKeywords.some(keyword => lowerContent.includes(keyword));

    if (foundToolUsage) {
      console.log('❌ TEST FAILED: Response still mentions tool usage or errors');
      console.log('   Keywords found:', toolKeywords.filter(k => lowerContent.includes(k)));
      process.exit(1);
    } else {
      console.log('✅ TEST PASSED: No tool usage detected');
      console.log('   Gemini responded with plain text without attempting file operations');
    }

    console.log();
    console.log('━'.repeat(80));
    console.log('✅ Gemini tool fix verified successfully!');
    console.log('━'.repeat(80));

  } catch (error) {
    console.error('❌ TEST FAILED:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
