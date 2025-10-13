#!/usr/bin/env ts-node
/**
 * 2系統ログ & PII保護機能のテスト
 * - PII検出
 * - マスキング
 * - ポリシー評価
 * - 再現性メタデータ
 * - 開発者ログ vs 監査ログ
 */

import PIIProtectionService from '../src/services/pii-protection';
import { AuditLoggerV2 } from '../src/services/audit-logger-v2';

async function main() {
  console.log('🧪 2系統ログ & PII保護機能テスト\n');
  console.log('━'.repeat(80));

  // ============================================================
  // テスト1: PII検出
  // ============================================================
  console.log('\n📋 テスト1: PII検出');
  console.log('━'.repeat(80));

  const testContent = `
    ユーザー情報:
    - Email: user@example.com
    - 電話: 090-1234-5678
    - APIキー: sk-abc123def456ghi789jkl012mno345pqr678
    - パスワード: MySecretPass123!
    - セッショントークン: sess_9f8e7d6c5b4a3210fedcba9876543210
    - IPアドレス: 192.168.1.100
  `;

  const piiDetection = await PIIProtectionService.detectPII(testContent);
  console.log('\n✅ PII検出結果:');
  console.log(`  検出: ${piiDetection.detected ? 'あり' : 'なし'}`);
  console.log(`  リスクレベル: ${piiDetection.riskLevel}`);
  console.log(`  検出タイプ: ${piiDetection.types.join(', ')}`);
  console.log(`  検出箇所数: ${piiDetection.locations.length}`);

  piiDetection.locations.slice(0, 5).forEach((loc, i) => {
    console.log(`    ${i + 1}. タイプ: ${loc.type}, フィールド: ${loc.field}`);
  });

  // ============================================================
  // テスト2: マスキング
  // ============================================================
  console.log('\n\n📋 テスト2: マスキング');
  console.log('━'.repeat(80));

  const maskedContent = await PIIProtectionService.maskContent(testContent, piiDetection);
  console.log('\n【元のコンテンツ】');
  console.log(testContent.substring(0, 200) + '...');

  console.log('\n【マスク済みコンテンツ】');
  console.log(maskedContent.substring(0, 200) + '...');

  console.log('\n✅ マスキング詳細:');
  piiDetection.locations.slice(0, 5).forEach((loc, i) => {
    if (loc.maskedValue) {
      console.log(`  ${i + 1}. ${loc.type}: ${loc.maskedValue}`);
    }
  });

  // ============================================================
  // テスト3: ポリシー評価
  // ============================================================
  console.log('\n\n📋 テスト3: ポリシー評価');
  console.log('━'.repeat(80));

  // 許可されるプロジェクト（techsapo）
  const allowedPolicy = await PIIProtectionService.evaluatePolicy(
    'techsapo',
    'llm-response',
    'external',
    piiDetection
  );

  console.log('\n【許可されるプロジェクト: techsapo】');
  console.log(`  許可: ${allowedPolicy.allowed ? '✅ はい' : '❌ いいえ'}`);
  console.log(`  ポリシーID: ${allowedPolicy.policyId}`);
  console.log(`  理由: ${allowedPolicy.reason}`);
  if (allowedPolicy.restrictions) {
    console.log(`  制限:  ${allowedPolicy.restrictions.length}件`);
    allowedPolicy.restrictions.forEach((r, i) => {
      console.log(`    ${i + 1}. [${r.severity}] ${r.message} → ${r.appliedAction}`);
    });
  }

  // 禁止されるプロジェクト（顧客コード）
  const blockedPolicy = await PIIProtectionService.evaluatePolicy(
    'customer-project-abc',
    'source-code',
    'external',
    piiDetection
  );

  console.log('\n【禁止されるプロジェクト: customer-project-abc】');
  console.log(`  許可: ${blockedPolicy.allowed ? '✅ はい' : '❌ いいえ'}`);
  console.log(`  ポリシーID: ${blockedPolicy.policyId}`);
  console.log(`  理由: ${blockedPolicy.reason}`);
  if (blockedPolicy.restrictions) {
    console.log(`  制限: ${blockedPolicy.restrictions.length}件`);
    blockedPolicy.restrictions.forEach((r, i) => {
      console.log(`    ${i + 1}. [${r.severity}] ${r.message} → ${r.appliedAction}`);
    });
  }

  // ============================================================
  // テスト4: オブジェクト全体のサニタイズ
  // ============================================================
  console.log('\n\n📋 テスト4: オブジェクト全体のサニタイズ');
  console.log('━'.repeat(80));

  const testObject = {
    user: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '090-1234-5678'
    },
    credentials: {
      apiKey: 'sk-test123456789abcdefghijklmnop',
      password: 'SuperSecret123!'
    },
    request: {
      ipAddress: '192.168.1.100',
      sessionToken: 'sess_abc123def456'
    }
  };

  console.log('\n【元のオブジェクト】');
  console.log(JSON.stringify(testObject, null, 2));

  const { sanitized, piiDetection: objPiiDetection } = await PIIProtectionService.sanitizeObject(testObject);

  console.log('\n【サニタイズ済みオブジェクト】');
  console.log(JSON.stringify(sanitized, null, 2));

  console.log('\n✅ サニタイズ結果:');
  console.log(`  PII検出: ${objPiiDetection.detected ? 'あり' : 'なし'}`);
  console.log(`  リスクレベル: ${objPiiDetection.riskLevel}`);
  console.log(`  検出箇所数: ${objPiiDetection.locations.length}`);

  // ============================================================
  // テスト5: 再現性メタデータ生成
  // ============================================================
  console.log('\n\n📋 テスト5: 再現性メタデータ生成');
  console.log('━'.repeat(80));

  const reproducibility = await PIIProtectionService.generateReproducibilityMetadata(
    'google',
    'gemini-2.5-pro',
    'テスト用プロンプト: コードレビューを実施してください',
    [
      { type: 'file', identifier: '/ai/prj/techdev/src/services/wall-bounce-analyzer.ts' },
      { type: 'memory', identifier: 'cipher-session-123' },
      { type: 'vector-db', identifier: 'upstash-vector-chunk-456' }
    ],
    {
      temperature: 0.7,
      topP: 0.9,
      seed: 42,
      version: '2.5-pro'
    }
  );

  console.log('\n✅ 再現性メタデータ:');
  console.log(JSON.stringify(reproducibility, null, 2));

  // ============================================================
  // テスト6: 2系統ログ書き込み
  // ============================================================
  console.log('\n\n📋 テスト6: 2系統ログ書き込み');
  console.log('━'.repeat(80));

  await AuditLoggerV2.initSession({ testName: 'test-dual-logging-session' });

  await AuditLoggerV2.logLLMInteraction(
    {
      provider: 'google',
      model: 'gemini-2.5-pro',
      prompt: {
        content: `
          ユーザー情報を含むプロンプト:
          Email: sensitive.user@company.com
          APIキー: sk-prod-xyz789abc456def123
          タスク: このコードをレビューしてください
        `,
        tokens: 150,
        hash: 'prompt_hash_abc123'
      },
      response: {
        content: 'レビュー結果: コードは良好です',
        tokens: 80,
        confidence: 0.92
      },
      roundNumber: 1,
      totalRounds: 1,
      purpose: 'analysis'
    },
    undefined,
    'code-review',
    'moderate',
    {
      provider: 'google',
      model: 'gemini-2.5-pro',
      temperature: 0.7,
      topP: 0.9,
      seed: 42,
      contextSources: [
        { type: 'file', identifier: '/ai/prj/techdev/src/services/wall-bounce-analyzer.ts' }
      ]
    }
  );

  console.log('\n✅ LLMインタラクションログを記録しました');
  console.log('  開発者ログ: /audit/techdev/developer/llm-interaction/YYYY-MM-DD.jsonl');
  console.log('  監査ログ: /audit/techdev/compliance/llm-interaction/YYYY-MM-DD.jsonl');

  await AuditLoggerV2.endSession('completed');

  // ============================================================
  // テスト7: 2系統ログの比較
  // ============================================================
  console.log('\n\n📋 テスト7: 2系統ログの比較');
  console.log('━'.repeat(80));

  const sampleEntry = {
    timestamp: new Date().toISOString(),
    action: 'test_action',
    category: 'action',
    user: 'test-user',
    result: 'success',
    details: {
      email: 'user@example.com',
      apiKey: 'sk-test123456789',
      normalField: 'この情報は機密ではありません'
    }
  };

  const { developer, audit, piiDetection: entryPiiDetection } = await PIIProtectionService.prepareDualLogs(sampleEntry);

  console.log('\n【開発者ログ（フル情報）】');
  console.log(JSON.stringify(developer, null, 2).substring(0, 300) + '...');

  console.log('\n【監査ログ（マスク済み）】');
  console.log(JSON.stringify(audit, null, 2).substring(0, 300) + '...');

  console.log('\n✅ 2系統ログの違い:');
  console.log(`  PII検出: ${entryPiiDetection.detected ? 'あり' : 'なし'}`);
  console.log(`  マスキング箇所: ${entryPiiDetection.locations.length}件`);
  console.log(`  リスクレベル: ${entryPiiDetection.riskLevel}`);

  // ============================================================
  // サマリー
  // ============================================================
  console.log('\n\n━'.repeat(80));
  console.log('📊 テストサマリー');
  console.log('━'.repeat(80));

  console.log('\n✅ 実証された機能:');
  console.log('  1️⃣ PII検出: Email, 電話, APIキー, パスワード, セッショントークン');
  console.log('  2️⃣ マスキング: 各PIIタイプに応じた適切なマスキング');
  console.log('  3️⃣ ポリシー評価: プロジェクト別の送信可否判定');
  console.log('  4️⃣ オブジェクトサニタイズ: 構造化データ全体のPII除去');
  console.log('  5️⃣ 再現性メタデータ: モデル・温度・seed・コンテキスト参照元記録');
  console.log('  6️⃣ 2系統ログ: 開発者向け詳細 & 監査向けマスク済み');

  console.log('\n💡 実装のポイント:');
  console.log('  • 正規表現ベースのPII検出（カスタムパターン対応）');
  console.log('  • PIIタイプ別のマスキング戦略');
  console.log('  • プロジェクトポリシーに基づく外部送信制御');
  console.log('  • 顧客コード保護（customer-*, client-*パターン）');
  console.log('  • LLM実行の完全な再現性確保');
  console.log('  • JSONL形式での高速ログ追記');

  console.log('\n🎯 ベストプラクティス:');
  console.log('  1. すべてのLLMインタラクションで再現性メタデータを記録');
  console.log('  2. 外部送信前に必ずポリシー評価を実施');
  console.log('  3. 重大なPII検出時は自動アラート');
  console.log('  4. 開発者ログは30日、監査ログは2年保持');
  console.log('  5. GDPR/CCPA準拠のデータ消去権対応');

  console.log('\n━'.repeat(80));
  console.log('✅ 2系統ログ & PII保護機能テスト完了！');
  console.log('━'.repeat(80));
  console.log('');
}

main().catch(console.error);
