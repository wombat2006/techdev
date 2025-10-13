/**
 * LLM Client統合テスト
 *
 * 実際のLLM呼び出しをテストして動作を確認
 */

import LLMClient from '../src/services/llm-client';
import logger from '../src/utils/logger';

async function main() {
  console.log('🧪 LLM Client統合テスト開始\n');

  // テスト1: Gemini 2.5 Flash (最速・最安)
  try {
    console.log('1️⃣ Gemini 2.5 Flash テスト');
    const geminiResponse = await LLMClient.invoke(
      'gemini-2.5-flash',
      '次のPython関数をTypeScriptに変換してください:\n\ndef add(a, b):\n    return a + b',
      {
        temperature: 0.3
      }
    );

    console.log('✅ Gemini 2.5 Flash 応答:');
    console.log(`   入力トークン: ${geminiResponse.inputTokens}`);
    console.log(`   出力トークン: ${geminiResponse.outputTokens}`);
    console.log(`   コスト: $${geminiResponse.estimatedCost.toFixed(6)}`);
    console.log(`   レイテンシ: ${geminiResponse.latencyMs}ms`);
    console.log(`   応答プレビュー: ${geminiResponse.content.substring(0, 150)}...\n`);
  } catch (error) {
    console.error('❌ Gemini 2.5 Flash エラー:', error instanceof Error ? error.message : error);
  }

  // テスト2: Qwen3 Coder (OpenRouter経由)
  try {
    console.log('2️⃣ Qwen3 Coder テスト');
    const qwenResponse = await LLMClient.invoke(
      'qwen3-coder',
      '次のコードをリファクタリングして、calculateTotal関数を抽出してください:\n\nfunction processOrder(items, taxRate, discount) {\n  let total = 0;\n  for (let i = 0; i < items.length; i++) {\n    total += items[i].price * items[i].quantity;\n  }\n  total = total * (1 + taxRate) - discount;\n  return total;\n}',
      {
        temperature: 0.3
      }
    );

    console.log('✅ Qwen3 Coder 応答:');
    console.log(`   入力トークン: ${qwenResponse.inputTokens}`);
    console.log(`   出力トークン: ${qwenResponse.outputTokens}`);
    console.log(`   コスト: $${qwenResponse.estimatedCost.toFixed(6)}`);
    console.log(`   レイテンシ: ${qwenResponse.latencyMs}ms`);
    console.log(`   応答プレビュー: ${qwenResponse.content.substring(0, 150)}...\n`);
  } catch (error) {
    console.error('❌ Qwen3 Coder エラー:', error instanceof Error ? error.message : error);
  }

  // テスト3: GPT-5 Codex (Codex MCP経由)
  try {
    console.log('3️⃣ GPT-5 Codex テスト');
    const gpt5Response = await LLMClient.invoke(
      'gpt-5-codex',
      'TypeScriptで、配列の重複を削除する関数を書いてください。',
      {
        temperature: 0.3
      }
    );

    console.log('✅ GPT-5 Codex 応答:');
    console.log(`   入力トークン: ${gpt5Response.inputTokens}`);
    console.log(`   出力トークン: ${gpt5Response.outputTokens}`);
    console.log(`   コスト: $${gpt5Response.estimatedCost.toFixed(6)}`);
    console.log(`   レイテンシ: ${gpt5Response.latencyMs}ms`);
    console.log(`   応答プレビュー: ${gpt5Response.content.substring(0, 150)}...\n`);
  } catch (error) {
    console.error('❌ GPT-5 Codex エラー:', error instanceof Error ? error.message : error);
  }

  // テスト4: 利用可能なモデル一覧
  console.log('4️⃣ 利用可能なモデル一覧');
  const models = await LLMClient.listModels();
  console.log(`   合計 ${models.length} モデル:`);
  for (const model of models) {
    console.log(`   - ${model.id} (${model.provider}): ${model.name}`);
  }

  console.log('\n✅ LLM Client統合テスト完了!');
}

main().catch(error => {
  console.error('❌ テスト失敗:', error);
  process.exit(1);
});
