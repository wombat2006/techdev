/**
 * 単一評価テスト
 *
 * 1つのモデルで1つのテストケースを実行して、
 * LLM統合が正しく動作することを確認
 */

import EvalRunner from '../src/services/eval-runner';

async function main() {
  console.log('🧪 単一評価テスト開始\n');

  // テストスイートロード
  const testSuites = await EvalRunner.loadGoldenTests();
  const refactoringTests = testSuites.refactoring.tests;
  const testCase = refactoringTests[0]; // Extract Function test

  console.log(`📦 テストケース: ${testCase.name}`);
  console.log(`   タイプ: ${testCase.type}`);
  console.log(`   難易度: ${testCase.difficulty}`);
  console.log(`   最大スコア: ${testCase.scoring.maxScore}`);
  console.log(`   合格スコア: ${testCase.scoring.passingScore}\n`);

  // Gemini 2.5 Flashで実行（最速モデル）
  const modelId = 'gemini-2.5-flash';
  console.log(`🤖 モデル: ${modelId}\n`);

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
    console.log(`      詳細: ${criterion.details}\n`);
  }

  console.log(`💻 LLM出力プレビュー:`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(result.output.substring(0, 500));
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  console.log('✅ 単一評価テスト完了!');
}

main().catch(error => {
  console.error('❌ テスト失敗:', error);
  process.exit(1);
});
