/**
 * Wall-Bounce定数定義
 * プロバイダーガイダンス、アグリゲーター指示など
 */

import * as fs from 'fs';
import * as path from 'path';
import type { LLMProvidersConfig } from './types';
import { logger } from '../../utils/logger';

// Load provider configuration from external file
let providersConfig: LLMProvidersConfig;
try {
  const configPath = path.join(__dirname, '../../config/llm-providers.json');
  providersConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
} catch (error) {
  logger.error('Failed to load LLM providers config', { error });
  throw new Error('LLM providers configuration is required');
}

export { providersConfig };

export const DEFAULT_AGGREGATOR_PROVIDER = providersConfig.aggregatorSelection.defaultAggregator;
export const COMPLEX_AGGREGATOR_PROVIDER = providersConfig.aggregatorSelection.complexAggregator;

/**
 * Provider別ガイダンス設定
 */
export const PROVIDER_GUIDANCE: Record<string, { parallel?: string[]; sequential?: string }> = {
  'gemini-2.5-deepthinking': {
    parallel: [
      '数学的・科学的な厳密性を重視し、複数の仮説を並列検証してください。',
      '段階的な推論プロセスを示し、結論に至るまでの思考過程を明示してください。'
    ],
    sequential: '既出の仮説を再検証し、論理的な一貫性と追加の洞察を提供してください。'
  },
  'gemini-2.5-pro': {
    parallel: [
      '最新の公開情報や業界トレンドを踏まえ、全体の背景・課題・影響を整理してください。',
      '日本語で、箇条書きと短い補足説明を組み合わせてください。'
    ],
    sequential: 'これまでに得られた洞察を補足し、背景情報や潜在的リスクを整理してください。'
  },
  'gemini-2.5-flash': {
    parallel: [
      '高速に主要ポイントを抽出し、短い箇条書きで提示してください。',
      '重要なメトリクスや即応すべき事項があれば明示してください。'
    ],
    sequential: '直前までの要約を踏まえ、即応すべきアクションと短期的な影響を補足してください。'
  },
  'gpt-5': {
    parallel: [
      '一般的な知識や背景情報を整理し、全体像を示してください。',
      '多角的な視点から分析し、バランスの取れた見解を提供してください。'
    ],
    sequential: '既出の情報を踏まえ、追加の文脈や関連情報を補足してください。'
  },
  'gpt-5-codex': {
    parallel: [
      '実装方針や設定変更の手順を具体的に示してください。',
      '必要に応じてコードスニペットやコマンド例を提示してください。'
    ],
    sequential: '既出の洞察を踏まえ、実装・設定面の具体的な手順と注意点を補足してください。'
  },
  'qwen3-coder': {
    parallel: [
      'TypeScriptのベストプラクティスに沿って具体的なコード例を示してください。',
      '差分形式や検証ステップがある場合は明記し、潜在的な副作用も指摘してください。'
    ],
    sequential: '既出のコード提案を精査し、品質向上やバグ防止の観点から追加の改善策を示してください。'
  },
  'sonnet-4.5': {
    parallel: [
      'アーキテクチャや設計の選択肢を比較し、それぞれのメリット/デメリットを整理してください。',
      '段階的な説明で結論まで導いてください。'
    ],
    sequential: 'これまでの結果を俯瞰し、意思決定観点や長期的な影響を整理してください。'
  },
  'opus-4.1': {
    parallel: [
      '人的・運用的な観点からの影響やリスク、関係者コミュニケーションのポイントをまとめてください。',
      '簡潔なストーリーを添えてください。'
    ],
    sequential: '既出の分析を踏まえ、運用手順やコミュニケーション観点での推奨事項を補足してください。'
  }
};

/**
 * Aggregator指示
 */
export const AGGREGATOR_INSTRUCTIONS = [
  '以下の各LLM回答を統合し、矛盾があれば整合させてください。',
  '重複内容は統合し、最終的な推奨行動・留意点・フォローアップを明確にしてください。',
  'アウトプットは日本語で、要約→推奨→リスク/フォローアップの順で構成してください。'
];

/**
 * Geminiモデル名マッピング
 */
export const GEMINI_MODEL_MAP: Record<string, string> = {
  '2.5-pro': 'gemini-2.5-flash',  // Pro version uses standard flash for now
  '2.5-flash': 'gemini-2.5-flash',
  '2.5-deep-think': 'gemini-2.5-flash-thinking',
  '2.5-deepthinking': 'gemini-2.5-flash-thinking'
};

/**
 * Anthropic モデル名マッピング
 */
export const ANTHROPIC_MODEL_MAP: Record<string, string> = {
  'sonnet-4.5': 'claude-sonnet-4-20250514',
  '3.5-sonnet': 'claude-3-5-sonnet-20241022',
  '3.5-haiku': 'claude-3-5-haiku-20241022',
  'opus-4.1': 'claude-opus-4-20250514',
  '3-opus': 'claude-3-opus-20240229',
};

/**
 * Anthropic 価格設定 (per 1M tokens)
 */
export const ANTHROPIC_PRICING: Record<string, { input: number; output: number }> = {
  'sonnet-4.5': { input: 3.00, output: 15.00 },
  '3.5-sonnet': { input: 3.00, output: 15.00 },
  '3.5-haiku': { input: 0.80, output: 4.00 },
  'opus-4.1': { input: 15.00, output: 75.00 },
  '3-opus': { input: 15.00, output: 75.00 },
};
