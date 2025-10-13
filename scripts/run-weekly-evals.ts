#!/usr/bin/env ts-node
/**
 * 週次評価実行スクリプト
 * ゴールデンテストを全モデルに対して実行し、ベンチマークを生成
 */

import EvalRunner from '../src/services/eval-runner';
import { GoldenTestCase, EvalResult, ModelBenchmark } from '../src/types/eval-schema';

async function main() {
  console.log('🚀 週次評価実行開始\n');
  console.log('━'.repeat(80));

  // 設定ロード
  const config = await EvalRunner.loadConfig();
  console.log(`\n📋 設定ロード完了`);
  console.log(`  対象モデル: ${config.goldenTests.models.length}件`);
  console.log(`  並列実行: ${config.goldenTests.parallelExecution ? '有効' : '無効'}`);
  console.log(`  タイムアウト: ${config.goldenTests.timeoutMs}ms`);

  // テストスイートロード
  const testSuites = await EvalRunner.loadGoldenTests();
  const allTests: GoldenTestCase[] = [];

  for (const [suiteName, suite] of Object.entries(testSuites)) {
    console.log(`\n📦 ${suiteName}: ${suite.tests.length}件のテスト`);
    allTests.push(...suite.tests);
  }

  console.log(`\n  総テスト数: ${allTests.length}件`);

  // ============================================================
  // 全モデルでテスト実行
  // ============================================================
  console.log('\n\n━'.repeat(80));
  console.log('🧪 テスト実行開始');
  console.log('━'.repeat(80));

  const modelResults = new Map<string, EvalResult[]>();

  for (const modelId of config.goldenTests.models) {
    console.log(`\n\n🤖 モデル: ${modelId}`);
    console.log('─'.repeat(80));

    const results: EvalResult[] = [];

    for (let i = 0; i < allTests.length; i++) {
      const testCase = allTests[i];
      console.log(`\n[${i + 1}/${allTests.length}] ${testCase.name} (${testCase.type})`);

      try {
        const result = await EvalRunner.runTestCase(
          testCase,
          modelId,
          'latest'
        );

        results.push(result);

        console.log(`  ${result.passed ? '✅ 合格' : '❌ 不合格'}: ${result.score.toFixed(1)}/${result.maxScore}`);
        console.log(`  実行時間: ${result.metrics.executionTimeMs}ms`);
        console.log(`  コスト: $${result.metrics.estimatedCost.toFixed(6)}`);

      } catch (error) {
        console.error(`  ❌ エラー: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    modelResults.set(modelId, results);
  }

  // ============================================================
  // ベンチマーク生成
  // ============================================================
  console.log('\n\n━'.repeat(80));
  console.log('📊 ベンチマーク生成');
  console.log('━'.repeat(80));

  const benchmarks: ModelBenchmark[] = [];

  for (const [modelId, results] of modelResults) {
    console.log(`\n🤖 ${modelId}`);

    const benchmark = await EvalRunner.generateBenchmark(modelId, 'latest', results);
    benchmarks.push(benchmark);

    console.log(`  総合スコア: ${benchmark.overallScore.toFixed(1)}/100`);
    console.log(`  カテゴリ別合格率:`);
    console.log(`    リファクタリング: ${benchmark.categoryScores.refactoring.passRate.toFixed(1)}%`);
    console.log(`    バグ修正: ${benchmark.categoryScores.bugFix.passRate.toFixed(1)}%`);
    console.log(`    移植: ${benchmark.categoryScores.porting.passRate.toFixed(1)}%`);
    console.log(`  平均実行時間: ${benchmark.performance.averageExecutionTimeMs.toFixed(0)}ms`);
    console.log(`  総コスト: $${benchmark.performance.totalCost.toFixed(4)}`);
  }

  // ============================================================
  // モデル比較表
  // ============================================================
  console.log('\n\n━'.repeat(80));
  console.log('📈 モデル比較');
  console.log('━'.repeat(80));

  // スコア順にソート
  benchmarks.sort((a, b) => b.overallScore - a.overallScore);

  console.log('\n┌──────┬───────────────────────┬────────┬────────────┬─────────┐');
  console.log('│ 順位 │ モデル                │ スコア │ 平均時間   │ 総コスト│');
  console.log('├──────┼───────────────────────┼────────┼────────────┼─────────┤');

  benchmarks.forEach((benchmark, index) => {
    const rank = `${index + 1}`.padStart(4);
    const model = benchmark.modelId.padEnd(21).substring(0, 21);
    const score = `${benchmark.overallScore.toFixed(1)}`.padStart(6);
    const time = `${benchmark.performance.averageExecutionTimeMs.toFixed(0)}ms`.padStart(10);
    const cost = `$${benchmark.performance.totalCost.toFixed(4)}`.padStart(8);

    console.log(`│ ${rank} │ ${model} │ ${score} │ ${time} │ ${cost} │`);
  });

  console.log('└──────┴───────────────────────┴────────┴────────────┴─────────┘');

  // ============================================================
  // トップパフォーマー
  // ============================================================
  console.log('\n\n🏆 トップパフォーマー:');

  const topByScore = benchmarks[0];
  console.log(`  精度: ${topByScore.modelId} (${topByScore.overallScore.toFixed(1)}/100)`);

  const topBySpeed = [...benchmarks].sort(
    (a, b) => a.performance.averageExecutionTimeMs - b.performance.averageExecutionTimeMs
  )[0];
  console.log(`  速度: ${topBySpeed.modelId} (${topBySpeed.performance.averageExecutionTimeMs.toFixed(0)}ms)`);

  const topByCost = [...benchmarks].sort(
    (a, b) => a.performance.totalCost - b.performance.totalCost
  )[0];
  console.log(`  コスト: ${topByCost.modelId} ($${topByCost.performance.totalCost.toFixed(4)})`);

  // ============================================================
  // サマリー
  // ============================================================
  console.log('\n\n━'.repeat(80));
  console.log('📊 評価サマリー');
  console.log('━'.repeat(80));

  const totalTests = allTests.length * config.goldenTests.models.length;
  const totalPassed = Array.from(modelResults.values())
    .flat()
    .filter(r => r.passed)
    .length;
  const overallPassRate = (totalPassed / totalTests) * 100;

  console.log(`\n  総テスト実行数: ${totalTests}件`);
  console.log(`  合格: ${totalPassed}件`);
  console.log(`  全体合格率: ${overallPassRate.toFixed(1)}%`);

  const totalCost = benchmarks.reduce((sum, b) => sum + b.performance.totalCost, 0);
  console.log(`  総コスト: $${totalCost.toFixed(4)}`);

  console.log('\n💡 推奨事項:');

  // 低スコアモデルの特定
  const lowScoreModels = benchmarks.filter(b => b.overallScore < 70);
  if (lowScoreModels.length > 0) {
    console.log(`  ⚠️  ${lowScoreModels.length}件のモデルがスコア70未満:`);
    lowScoreModels.forEach(b => {
      console.log(`     - ${b.modelId}: ${b.overallScore.toFixed(1)}/100`);
    });
  } else {
    console.log(`  ✅ すべてのモデルがスコア70以上を達成`);
  }

  // コスト最適化の提案
  const avgCost = totalCost / benchmarks.length;
  const expensiveModels = benchmarks.filter(b => b.performance.totalCost > avgCost * 1.5);
  if (expensiveModels.length > 0) {
    console.log(`\n  💰 コスト最適化候補:`);
    expensiveModels.forEach(b => {
      console.log(`     - ${b.modelId}: $${b.performance.totalCost.toFixed(4)} (平均の${(b.performance.totalCost / avgCost).toFixed(1)}倍)`);
    });
  }

  console.log('\n━'.repeat(80));
  console.log('✅ 週次評価完了！');
  console.log('━'.repeat(80));
  console.log('');
}

main().catch(console.error);
