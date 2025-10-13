/**
 * Qwen3 Coder評価テスト
 *
 * OpenRouter経由でQwen3 Coderを使用した評価テスト
 */

import EvalRunner from '../src/services/eval-runner';

async function main() {
  console.log('🧪 Qwen3 Coder評価テスト開始\n');

  // 環境変数確認
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('❌ OPENROUTER_API_KEY環境変数が設定されていません');
    process.exit(1);
  }
  console.log('✅ OPENROUTER_API_KEY設定確認完了\n');

  // テストスイートロード
  const testSuites = await EvalRunner.loadGoldenTests();
  const refactoringTests = testSuites.refactoring.tests;
  const testCase = refactoringTests[0]; // Extract Function test

  console.log(`📦 テストケース: ${testCase.name}`);
  console.log(`   タイプ: ${testCase.type}`);
  console.log(`   難易度: ${testCase.difficulty}\n`);

  // Qwen3 Coderで実行
  const modelId = 'qwen3-coder';
  console.log(`🤖 モデル: ${modelId} (OpenRouter経由)\n`);

  console.log('⏳ テスト実行中...\n');
  const result = await EvalRunner.runTestCase(testCase, modelId, 'latest');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`📊 評価結果`);
  console.log(`   ${result.passed ? '✅ 合格' : '❌ 不合格'}`);
  console.log(`   スコア: ${result.score.toFixed(1)}/${result.maxScore}`);
  console.log(`   実行時間: ${result.metrics.executionTimeMs}ms`);
  console.log(`   入力トークン: ${result.metrics.inputTokens}`);
  console.log(`   出力トークン: ${result.metrics.outputTokens}`);
  console.log(`   コスト: $${result.metrics.estimatedCost.toFixed(6)}\n`);

  console.log(`📝 採点基準:`);
  for (const criterion of result.criteriaResults) {
    const status = criterion.passed ? '✅' : '❌';
    console.log(`   ${status} ${criterion.criterionName}`);
    console.log(`      スコア: ${criterion.score.toFixed(1)}/${criterion.maxScore.toFixed(1)}`);
    if (criterion.details) {
      console.log(`      詳細: ${criterion.details}`);
    }
    console.log();
  }

  console.log(`💻 LLM出力プレビュー:`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(result.output.substring(0, 800));
  if (result.output.length > 800) {
    console.log(`\n... (残り ${result.output.length - 800} 文字)`);
  }
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  console.log('✅ Qwen3 Coder評価テスト完了!');
}

main().catch(error => {
  console.error('❌ テスト失敗:', error);
  process.exit(1);
});
