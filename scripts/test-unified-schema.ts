#!/usr/bin/env ts-node
/**
 * 統一LLMモデルスキーマテストスクリプト
 */

import {
  loadLLMModelsConfig,
  printModelsSummary,
  convertToLegacyProviderConfig,
  calculateCost,
  getModelById,
  getModelsByCapability,
  getCodingModels
} from '../src/utils/llm-model-loader';

async function main() {
  console.log('🧪 統一LLMモデルスキーマテスト開始\n');

  try {
    // 1. スキーマロード
    console.log('1️⃣ スキーマロード...');
    const config = loadLLMModelsConfig();
    console.log('✅ ロード成功\n');

    // 2. サマリー表示
    console.log('2️⃣ モデルサマリー表示...');
    printModelsSummary(config);

    // 3. モデル検索テスト
    console.log('3️⃣ モデル検索テスト...');

    const deepThink = getModelById(config, 'gemini-2.5-deepthinking');
    console.log(`  Deep Think検索: ${deepThink ? '✅' : '❌'}`);
    if (deepThink) {
      console.log(`    - 名前: ${deepThink.name}`);
      console.log(`    - 出力上限: ${deepThink.limits.maxOutputTokens} tokens`);
    }

    const codingModels = getCodingModels(config);
    console.log(`  コーディングモデル数: ${codingModels.length}`);
    codingModels.forEach(model => {
      console.log(`    - ${model.name}`);
    });

    const reasoningModels = getModelsByCapability(config, 'reasoning');
    console.log(`  推論モデル数: ${reasoningModels.length}`);
    console.log('');

    // 4. 価格計算テスト
    console.log('4️⃣ 価格計算テスト...');
    const gpt5 = getModelById(config, 'gpt-5');
    if (gpt5) {
      const cost = calculateCost(gpt5, 100000, 50000, 'standard');
      console.log(`  GPT-5 (100K入力 + 50K出力): $${cost.toFixed(4)}`);
    }

    const geminiPro = getModelById(config, 'gemini-2.5-pro');
    if (geminiPro) {
      const cost = calculateCost(geminiPro, 100000, 50000);
      console.log(`  Gemini 2.5 Pro (100K入力 + 50K出力): $${cost.toFixed(4)}`);
    }
    console.log('');

    // 5. レガシー形式変換テスト
    console.log('5️⃣ レガシー形式変換テスト...');
    const legacy = convertToLegacyProviderConfig(config);
    console.log(`  変換後プロバイダー数: ${legacy.providers.length}`);
    console.log(`  デフォルトアグリゲーター: ${legacy.aggregatorSelection.defaultAggregator}`);
    console.log('  ✅ 後方互換性OK\n');

    // 6. バリデーション
    console.log('6️⃣ バリデーション...');
    const validationErrors: string[] = [];

    config.models.forEach(model => {
      // 必須フィールドチェック
      if (!model.id || !model.name || !model.provider) {
        validationErrors.push(`モデル ${model.id || 'unknown'}: 必須フィールド不足`);
      }

      // 価格情報チェック
      if (!model.pricing.inputPrice && !model.pricing.tiers) {
        validationErrors.push(`モデル ${model.id}: 価格情報不足`);
      }

      // アグリゲーター検証
      if (model.role && !['default-aggregator', 'complex-aggregator'].includes(model.role)) {
        validationErrors.push(`モデル ${model.id}: 無効なrole ${model.role}`);
      }
    });

    // アグリゲーターが存在するかチェック
    const defaultAgg = getModelById(config, config.aggregatorSelection.defaultAggregator);
    const complexAgg = getModelById(config, config.aggregatorSelection.complexAggregator);

    if (!defaultAgg) {
      validationErrors.push(`デフォルトアグリゲーター ${config.aggregatorSelection.defaultAggregator} が見つかりません`);
    }
    if (!complexAgg) {
      validationErrors.push(`複雑アグリゲーター ${config.aggregatorSelection.complexAggregator} が見つかりません`);
    }

    if (validationErrors.length === 0) {
      console.log('  ✅ バリデーション成功\n');
    } else {
      console.log('  ❌ バリデーションエラー:');
      validationErrors.forEach(error => console.log(`    - ${error}`));
      console.log('');
      process.exit(1);
    }

    // 7. プロバイダー設定確認
    console.log('7️⃣ プロバイダー設定確認...');
    Object.entries(config.providerConfig).forEach(([provider, provConfig]) => {
      console.log(`  ${provider}:`);
      console.log(`    - アクセス方法: ${provConfig.accessMethod}`);
      console.log(`    - レート制限: ${provConfig.rateLimits.requestsPerMinute} req/min`);
    });
    console.log('');

    console.log('✅ すべてのテスト成功！\n');

  } catch (error) {
    console.error('❌ テスト失敗:', error);
    process.exit(1);
  }
}

main();
