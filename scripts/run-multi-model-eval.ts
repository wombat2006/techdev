/**
 * 複数モデル評価実行
 *
 * GPT-5 CodexとQwen3 Coderで全テストケースを実行し、
 * ベンチマーク比較を生成
 */

import EvalRunner from '../src/services/eval-runner';
import { GoldenTestCase, EvalResult } from '../src/types/eval-schema';

async function main() {
  console.log('🚀 複数モデル評価実行開始\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 環境変数確認
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('❌ OPENROUTER_API_KEY環境変数が設定されていません');
    process.exit(1);
  }

  // テストスイートロード
  const config = await EvalRunner.loadConfig();
  const testSuites = await EvalRunner.loadGoldenTests();

  // 全テストケース収集
  const allTests: GoldenTestCase[] = [];
  for (const [category, suite] of Object.entries(testSuites)) {
    console.log(`📦 ${category}: ${suite.tests.length}件のテスト`);
    allTests.push(...suite.tests);
  }
  console.log(`\n  総テスト数: ${allTests.length}件\n`);

  // 評価対象モデル（Geminiはツール問題があるため除外）
  const models = [
    'gpt-5-codex',
    'qwen3-coder'
  ];

  console.log(`🤖 対象モデル: ${models.length}件`);
  for (const modelId of models) {
    console.log(`   - ${modelId}`);
  }
  console.log();

  // モデル別の結果格納
  const modelResults = new Map<string, EvalResult[]>();

  // 各モデルで評価実行
  for (const modelId of models) {
    console.log('━'.repeat(80));
    console.log(`\n🤖 モデル: ${modelId}\n`);

    const results: EvalResult[] = [];

    for (let i = 0; i < allTests.length; i++) {
      const testCase = allTests[i];
      console.log(`[${i + 1}/${allTests.length}] ${testCase.name} (${testCase.type})`);

      try {
        const result = await EvalRunner.runTestCase(testCase, modelId, 'latest');
        results.push(result);

        const status = result.passed ? '✅ 合格' : '❌ 不合格';
        console.log(`  ${status}: ${result.score.toFixed(1)}/${result.maxScore}`);
        console.log(`  実行時間: ${result.metrics.executionTimeMs}ms`);
        console.log(`  コスト: $${result.metrics.estimatedCost.toFixed(6)}\n`);
      } catch (error) {
        console.error(`  ❌ エラー: ${error instanceof Error ? error.message : error}\n`);
      }
    }

    modelResults.set(modelId, results);

    // ベンチマーク生成
    console.log(`\n📊 ベンチマーク生成中...\n`);
    const benchmark = await EvalRunner.generateBenchmark(modelId, 'latest', results);

    console.log(`✅ ベンチマーク生成完了`);
    console.log(`   総合スコア: ${benchmark.overallScore.toFixed(1)}/100`);
    console.log(`   合格率: ${benchmark.categoryScores.refactoring.passRate.toFixed(1)}% (refactoring)`);
    console.log(`   平均実行時間: ${benchmark.performance.averageExecutionTimeMs.toFixed(0)}ms`);
    console.log(`   総コスト: $${benchmark.performance.totalCost.toFixed(6)}\n`);
  }

  // 最終比較表
  console.log('━'.repeat(80));
  console.log('\n📊 モデル比較サマリー\n');
  console.log('┌─────────────────────┬────────┬────────────┬─────────┐');
  console.log('│ モデル              │ スコア │ 平均時間   │ 総コスト│');
  console.log('├─────────────────────┼────────┼────────────┼─────────┤');

  const comparisonData: Array<{
    modelId: string;
    score: number;
    avgTime: number;
    totalCost: number;
  }> = [];

  for (const [modelId, results] of modelResults) {
    const totalScore = results.reduce((sum, r) => sum + r.score, 0);
    const totalMaxScore = results.reduce((sum, r) => sum + r.maxScore, 0);
    const overallScore = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
    const avgTime = results.reduce((sum, r) => sum + r.metrics.executionTimeMs, 0) / results.length;
    const totalCost = results.reduce((sum, r) => sum + r.metrics.estimatedCost, 0);

    comparisonData.push({
      modelId,
      score: overallScore,
      avgTime,
      totalCost
    });
  }

  // スコア順にソート
  comparisonData.sort((a, b) => b.score - a.score);

  for (const data of comparisonData) {
    const modelPadded = data.modelId.padEnd(19);
    const scorePadded = data.score.toFixed(1).padStart(6);
    const timePadded = `${data.avgTime.toFixed(0)}ms`.padStart(10);
    const costPadded = `$${data.totalCost.toFixed(4)}`.padStart(8);
    console.log(`│ ${modelPadded} │ ${scorePadded} │ ${timePadded} │ ${costPadded} │`);
  }

  console.log('└─────────────────────┴────────┴────────────┴─────────┘\n');

  // トップパフォーマー
  const topByAccuracy = comparisonData[0];
  const topBySpeed = comparisonData.reduce((prev, curr) =>
    curr.avgTime < prev.avgTime ? curr : prev
  );
  const topByCost = comparisonData.reduce((prev, curr) =>
    curr.totalCost < prev.totalCost ? curr : prev
  );

  console.log('🏆 トップパフォーマー:\n');
  console.log(`   精度: ${topByAccuracy.modelId} (${topByAccuracy.score.toFixed(1)}/100)`);
  console.log(`   速度: ${topBySpeed.modelId} (${topBySpeed.avgTime.toFixed(0)}ms)`);
  console.log(`   コスト: ${topByCost.modelId} ($${topByCost.totalCost.toFixed(6)})\n`);

  // 推奨事項
  console.log('💡 推奨事項:\n');

  if (topByAccuracy.score >= 90) {
    console.log(`   ✅ ${topByAccuracy.modelId}が非常に高い精度を達成`);
  }

  if (topByCost.totalCost < 0.01) {
    console.log(`   ✅ ${topByCost.modelId}が優れたコスト効率を実現`);
  }

  const avgCostPerTest = topByCost.totalCost / allTests.length;
  console.log(`   📊 テストあたり平均コスト: $${avgCostPerTest.toFixed(6)}`);
  console.log(`   📊 週次実行の推定コスト (8モデル): $${(avgCostPerTest * allTests.length * 8).toFixed(4)}\n`);

  console.log('✅ 複数モデル評価完了!\n');
  console.log('━'.repeat(80));
}

main().catch(error => {
  console.error('❌ 評価実行失敗:', error);
  process.exit(1);
});
