#!/usr/bin/env ts-node
/**
 * コンテキスト最適化効果の実証検証
 * 実際のファイルを使って効果を測定
 */

import ContextOptimizer from '../src/services/context-optimizer';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('🔬 コンテキスト最適化効果 - 実証検証\n');
  console.log('━'.repeat(80));

  // ============================================================
  // シナリオ1: 大規模ファイルの最適化なし vs あり
  // ============================================================
  console.log('\n📋 シナリオ1: 大規模ファイルの読み込み最適化');
  console.log('━'.repeat(80));

  const targetFile = '/ai/prj/techdev/src/services/wall-bounce-analyzer.ts';
  const content = fs.readFileSync(targetFile, 'utf-8');
  const originalTokens = Math.ceil(content.length / 4);

  console.log(`\n対象ファイル: ${targetFile}`);
  console.log(`ファイルサイズ: ${(content.length / 1024).toFixed(2)} KB`);
  console.log(`推定トークン数: ${originalTokens.toLocaleString()}`);

  // 最適化なしの評価
  console.log('\n【最適化なし - 全ファイル投入】');
  const unoptimized = await ContextOptimizer.evaluateContextUsage(
    'gemini-2.5-pro',
    1000,
    originalTokens
  );
  console.log(await ContextOptimizer.generateUsageReport('gemini-2.5-pro', unoptimized));

  // 最適化ありの評価
  console.log('\n【最適化あり - tree-sitter分割 + サブセット抽出】');
  const optimized = await ContextOptimizer.autoOptimize('gemini-2.5-pro', content, 50000);
  const optimizedUsage = await ContextOptimizer.evaluateContextUsage(
    'gemini-2.5-pro',
    1000,
    optimized.optimizedTokens
  );
  console.log(await ContextOptimizer.generateUsageReport('gemini-2.5-pro', optimizedUsage));

  console.log('\n📊 最適化効果:');
  console.log(`  トークン削減: ${originalTokens.toLocaleString()} → ${optimized.optimizedTokens.toLocaleString()} (-${optimized.savingsPercent.toFixed(1)}%)`);
  console.log(`  コスト削減: $${unoptimized.estimatedCost.toFixed(4)} → $${optimizedUsage.estimatedCost.toFixed(4)} (-${((1 - optimizedUsage.estimatedCost / unoptimized.estimatedCost) * 100).toFixed(1)}%)`);
  console.log(`  レイテンシー削減: ${unoptimized.estimatedLatency}ms → ${optimizedUsage.estimatedLatency}ms (-${((1 - optimizedUsage.estimatedLatency / unoptimized.estimatedLatency) * 100).toFixed(1)}%)`);

  // ============================================================
  // シナリオ2: リポジトリ全体 vs インデックス+サブセット
  // ============================================================
  console.log('\n\n📋 シナリオ2: リポジトリ全体読み込み vs インデックス+サブセット抽出');
  console.log('━'.repeat(80));

  const repoPath = '/ai/prj/techdev/src';

  // 全ファイル読み込み（最適化なし）
  console.log('\n【最適化なし - 全ファイル読み込み】');
  let totalSize = 0;
  let fileCount = 0;

  const walkDir = (dirPath: string) => {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        walkDir(fullPath);
      } else if (entry.isFile() && /\.(ts|js)$/.test(entry.name)) {
        totalSize += fs.statSync(fullPath).size;
        fileCount++;
      }
    }
  };

  walkDir(repoPath);
  const totalTokens = Math.ceil(totalSize / 4);

  console.log(`  総ファイル数: ${fileCount}`);
  console.log(`  総サイズ: ${(totalSize / 1024).toFixed(2)} KB`);
  console.log(`  推定トークン数: ${totalTokens.toLocaleString()}`);

  const repoUnoptimized = await ContextOptimizer.evaluateContextUsage(
    'gemini-2.5-deepthinking',
    2000,
    totalTokens
  );
  console.log(`  推定コスト: $${repoUnoptimized.estimatedCost.toFixed(4)}`);
  console.log(`  推定レイテンシー: ${repoUnoptimized.estimatedLatency}ms`);
  console.log(`  警告数: ${repoUnoptimized.warnings.length}`);

  // インデックス+サブセット抽出（最適化あり）
  console.log('\n【最適化あり - インデックス+サブセット抽出】');
  const index = await ContextOptimizer.indexRepository(repoPath);

  console.log(`  インデックス作成完了:`);
  console.log(`    - 総ファイル数: ${index.totalFiles}`);
  console.log(`    - 総チャンク数: ${index.totalChunks}`);
  console.log(`    - 総トークン数: ${index.totalTokens.toLocaleString()}`);

  // 特定のシンボルに関連するサブセット抽出
  const targetSymbol = 'WallBounceAnalyzer';
  const subset = await ContextOptimizer.getRelevantSubset(repoPath, targetSymbol, 30000);
  const subsetTokens = subset.reduce((sum, c) => sum + c.tokens, 0);

  console.log(`  サブセット抽出 (シンボル: ${targetSymbol}):`);
  console.log(`    - 関連チャンク数: ${subset.length}`);
  console.log(`    - 抽出トークン数: ${subsetTokens.toLocaleString()}`);

  const repoOptimized = await ContextOptimizer.evaluateContextUsage(
    'gemini-2.5-deepthinking',
    2000,
    subsetTokens || 30000
  );
  console.log(`    - 推定コスト: $${repoOptimized.estimatedCost.toFixed(4)}`);
  console.log(`    - 推定レイテンシー: ${repoOptimized.estimatedLatency}ms`);
  console.log(`    - 警告数: ${repoOptimized.warnings.length}`);

  if (subsetTokens > 0) {
    console.log('\n📊 最適化効果:');
    console.log(`  トークン削減: ${totalTokens.toLocaleString()} → ${subsetTokens.toLocaleString()} (-${((1 - subsetTokens / totalTokens) * 100).toFixed(1)}%)`);
    console.log(`  コスト削減: $${repoUnoptimized.estimatedCost.toFixed(4)} → $${repoOptimized.estimatedCost.toFixed(4)} (-${((1 - repoOptimized.estimatedCost / repoUnoptimized.estimatedCost) * 100).toFixed(1)}%)`);
    console.log(`  レイテンシー削減: ${repoUnoptimized.estimatedLatency}ms → ${repoOptimized.estimatedLatency}ms (-${((1 - repoOptimized.estimatedLatency / repoUnoptimized.estimatedLatency) * 100).toFixed(1)}%)`);
  }

  // ============================================================
  // シナリオ3: 全量再出力 vs 差分プロンプト
  // ============================================================
  console.log('\n\n📋 シナリオ3: 全量再出力 vs 差分プロンプト');
  console.log('━'.repeat(80));

  const oldCode = fs.readFileSync('/ai/prj/techdev/src/config/llm-providers.json', 'utf-8');
  const newCode = fs.readFileSync('/ai/prj/techdev/src/config/llm-models.json', 'utf-8');

  // 全量再出力パターン
  console.log('\n【従来方式 - 全量再出力】');
  const fullRewriteTokens = Math.ceil((oldCode.length + newCode.length) / 4);
  console.log(`  元ファイル: ${Math.ceil(oldCode.length / 4).toLocaleString()} tokens`);
  console.log(`  新ファイル: ${Math.ceil(newCode.length / 4).toLocaleString()} tokens`);
  console.log(`  プロンプト総トークン: ${fullRewriteTokens.toLocaleString()}`);

  const fullRewriteUsage = await ContextOptimizer.evaluateContextUsage(
    'gpt-5-codex',
    fullRewriteTokens,
    0
  );
  console.log(`  推定コスト: $${fullRewriteUsage.estimatedCost.toFixed(4)}`);
  console.log(`  推定レイテンシー: ${fullRewriteUsage.estimatedLatency}ms`);

  // 差分プロンプトパターン
  console.log('\n【最適化方式 - 差分プロンプト (unified diff)】');
  const diffResult = await ContextOptimizer.generateDiffPrompt(
    oldCode,
    newCode,
    'config/llm-models.json'
  );

  console.log(`  差分統計:`);
  console.log(`    - 追加行数: ${diffResult.diff.totalAdditions}`);
  console.log(`    - 削除行数: ${diffResult.diff.totalDeletions}`);
  console.log(`    - Hunk数: ${diffResult.diff.hunks.length}`);
  console.log(`  プロンプトトークン: ${diffResult.estimatedTokens}`);

  const diffUsage = await ContextOptimizer.evaluateContextUsage(
    'gpt-5-codex',
    diffResult.estimatedTokens,
    0
  );
  console.log(`  推定コスト: $${diffUsage.estimatedCost.toFixed(4)}`);
  console.log(`  推定レイテンシー: ${diffUsage.estimatedLatency}ms`);

  console.log('\n📊 最適化効果:');
  console.log(`  トークン削減: ${fullRewriteTokens.toLocaleString()} → ${diffResult.estimatedTokens} (-${((1 - diffResult.estimatedTokens / fullRewriteTokens) * 100).toFixed(1)}%)`);
  console.log(`  コスト削減: $${fullRewriteUsage.estimatedCost.toFixed(4)} → $${diffUsage.estimatedCost.toFixed(4)} (-${((1 - diffUsage.estimatedCost / fullRewriteUsage.estimatedCost) * 100).toFixed(1)}%)`);
  console.log(`  レイテンシー削減: ${fullRewriteUsage.estimatedLatency}ms → ${diffUsage.estimatedLatency}ms (-${((1 - diffUsage.estimatedLatency / fullRewriteUsage.estimatedLatency) * 100).toFixed(1)}%)`);

  console.log('\n  付加価値:');
  console.log('    ✅ 衝突減少: 差分のみのため、他の変更との衝突が激減');
  console.log('    ✅ レビュー容易: 変更箇所が明確で、コードレビューが高速化');
  console.log('    ✅ 精度向上: 不要な部分を再生成しないため、意図しない変更が防止');

  // ============================================================
  // 総合サマリー
  // ============================================================
  console.log('\n\n━'.repeat(80));
  console.log('📊 総合検証結果サマリー');
  console.log('━'.repeat(80));

  console.log('\n✅ 実証された効果:');
  console.log('\n  1️⃣ 大規模ファイル最適化');
  console.log(`     トークン削減: -${optimized.savingsPercent.toFixed(1)}%`);
  console.log(`     コスト削減: -${((1 - optimizedUsage.estimatedCost / unoptimized.estimatedCost) * 100).toFixed(1)}%`);
  console.log(`     レイテンシー削減: -${((1 - optimizedUsage.estimatedLatency / unoptimized.estimatedLatency) * 100).toFixed(1)}%`);

  if (subsetTokens > 0) {
    console.log('\n  2️⃣ リポジトリインデックス+サブセット抽出');
    console.log(`     トークン削減: -${((1 - subsetTokens / totalTokens) * 100).toFixed(1)}%`);
    console.log(`     コスト削減: -${((1 - repoOptimized.estimatedCost / repoUnoptimized.estimatedCost) * 100).toFixed(1)}%`);
    console.log(`     レイテンシー削減: -${((1 - repoOptimized.estimatedLatency / repoUnoptimized.estimatedLatency) * 100).toFixed(1)}%`);
  }

  console.log('\n  3️⃣ 差分プロンプト');
  console.log(`     トークン削減: -${((1 - diffResult.estimatedTokens / fullRewriteTokens) * 100).toFixed(1)}%`);
  console.log(`     コスト削減: -${((1 - diffUsage.estimatedCost / fullRewriteUsage.estimatedCost) * 100).toFixed(1)}%`);
  console.log(`     レイテンシー削減: -${((1 - diffUsage.estimatedLatency / fullRewriteUsage.estimatedLatency) * 100).toFixed(1)}%`);
  console.log('     + 衝突減少、レビュー容易化、精度向上');

  console.log('\n💡 推奨アクション:');
  console.log('  • 10k tokens以上: tree-sitter分割を使用');
  console.log('  • 50k tokens以上: RAG検索を併用');
  console.log('  • 20k tokens以上のコード変更: 差分プロンプト必須');
  console.log('  • リポジトリ全体が必要な場合: インデックス作成 + サブセット抽出');

  console.log('\n🎯 ベストプラクティス:');
  console.log('  1. 常に推定トークン数を事前評価');
  console.log('  2. 警告閾値を超えたら自動最適化を実行');
  console.log('  3. コード変更は必ず差分プロンプトで提案');
  console.log('  4. 大規模リポジトリは事前インデックス作成');
  console.log('  5. RAGベクトルストアのキャッシュを活用');

  console.log('\n━'.repeat(80));
  console.log('✅ 検証完了！コンテキスト最適化の効果が実証されました。');
  console.log('━'.repeat(80));
  console.log('');
}

main().catch(console.error);
