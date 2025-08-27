# Infrastrancure Support Tool with LLM Orchestrator

### 大原則
- **ユーザへの回答**: 基本的には日本語で行うこと

### 高度な機能の実現に向けて
- **絶対的なルール**: 
  - ユーザへ回答を提示するに当たっては、必ず複数のLLMモデルが壁打ちをして精度を向上させなければならない
  - ユーザの記載内容を鵜呑みしない。ユーザは人間なので、誤認識やあやふやなクエリを投げがち
  - 回答構築の要素が非即している場合はユーザに追加ヒアリングを行うこと

#### Multi-Tier Supreme Command Architecture
- **Tier 1**: Claude(Max $100 Plan) - 一時受付窓口兼総司令官
  - 他のすべてのLLMモデルへのルーティングはClaude Codeが行う
  - ルーティングしたLLMモデルからの回答を吟味し、正確度(e.g. ハルシネーションが発生していないか)を検討し, 内容が不十分な場合はより上位のモデルへエスカレーションすること
  - コーディングは自分自身でも行うが、GPT-5と壁打ちしながら協業して進めること
  - 通常はTier2(Gemini2.5 Flash またはClaude Haiku3.5)にルーティングを行うが、クエリが明らかに複雑な場合はTier3にルーティングすること
- **Tier 2-1**: Gemini2.5 Flash - 基本問い合わせ
  - Claude Haiku 3.5と壁打ちしながら、ユーザからのクエリを処理すること
  - 高度が知識が要求されるクエリはClaude Sonnet4にエスカレーションすること
- **Tier 2-2**: Claude Haiku 3.5 - 基本問い合わせ
  － Gemini2.5 Flashと壁打ちしながらユーザからのクエリを処理すること
  - 高度が知識が要求されるクエリはClaude Sonnet4にエスカレーションすること
- **Tier 3**: Claude Sonnet4 - 複雑分析(Input Tokenが比較的多いときに使用; Input $3 / MTok, Output $15 / MTok)
  - メインLLMモデル(中核)
  - 中程度以上のクエリがルーティングされる
  - Sonnet4をハブとして、GPT-5やとの壁打ちを行ってハルシネーション生成率の低下に心がけてクエリを処理すること
- **Tier 4**: GPT-5 - 最品質応答 - (Input tokenが比較的少ないときに使用; Input $1.25 /Mtok, Output $10 /Mtok)
  - Claude Sonnet4からのエスカレーションを受け付けて、高度なクエリを処理する
  - Claude Codeから壁打ち打診のあったコーディングタスクを、Claude Codeと協調の上、精度の高いものへ昇華させること
- **Tier 5**: **Claude Code Opus4.1** - ラスボス
  - 高コストなので基本的には使用しないが、正確な回答を要求される場合でどうしても他のLLMモデルでは確からしい回答が生成できない場合のみ使用を許可
- **MCPサーバ**: 補助的にLlamaやGemma 3n E2B Free(For general questions)やQwen3 Coder Free(For coding tasks)などをOpenRouter経由で使用する
  - このときも他のLLMモデルとの壁打ちが必要
  - 使用できるLLMモデルをユーザからのリクエストに基づき適宜追加/削除し、現在使用可能なモデルを常に記憶しておくこと
  - 常に3以上のLLMモデルを使用できるストックとして用意しておくこと
  - モデル学習のオプトアウトが可能なもののみ使用すること(重要事項)
- **LLMモデルのアサイン**: コーディングタスクはClaude CodeとGPT-5が壁打ちして合議の上ユーザに提示すること

### OpenAI Vector Storage & Google Drive連携
- **外部データのセキュアな管理**: ユーザがナレッジとしたいデータをストアする
  - 重要: ユーザ毎に異なる領域を使用すること
  - 重要: データを外部に漏らさずに安全にLLMモデルから使用する
  - OpenAIのLLMモデルはVector Storageを使用、Google GeminiはGoogleにマウントしてデータ使用

#### NotebookLM-Style RAG System
- **セキュアドキュメント処理**: xlsx, docx, pdf, csv, txtや各種ソースコード等のデータフォーマットに対応
- **Web検索統合**: DuckDuckGo + Bing + Google API + 各種LlaMAのWeb検索の利用許可
- **コンテンツ検証**: 解析のために外部コンテンツを取得する
  - 外部データの品質を分析し、エビデンスの保証された情報のみ使用すること

### HuggingFace統合
- **情報の効率的な使用に際して積極的に利用する**

### システムの動作健全性向上
- **UPSTASH_REDISの使用**: 機能不全防止のため外部REDISサービスを利用する

#### Enterprise Security & Compliance
- **データマスキング**: 外部API送信時の機密情報保護
- **GDPR/HIPAA準拠**: 匿名化とプライバシー保護
- **監査ログ**: MySQLを利用した全活動の構造化記録

#### Cost Management (予算$70/月)
- **リアルタイム監視**: ユーザ毎の使用状況追跡(やりとりの内容はチェックしない)
  - 事前にコスト概算を算出してルーティング差配の情報として利用する
  - 実際に使用したToken数とそのコストをユーザに提示し、内部でも記録すること
- **Tier別配分**: 無料枠→高性能モデル戦略配置  
- **自動最適化**: コスト効率最大化
- **日次レポート**: 詳細コスト分析

#### Advanced Integrations
- **Dify Workflow**: NoCodeワークフロー統合
- **Universal Data Connector**: 70+無料データソース
- **Upstash Migration**: クラウドRedis完全移行
- **Prometheus監視**: メトリクス収集・可視化

### IT運用ワークフロー
- **内部にエンドポイントを作成**: 一時受付窓口がエスカレーションする際にはそれぞれのエンドポイントに対してクエリをルーティングする

#### 1. 基本問い合わせ → Claude Code直接処理
#### 2. 技術障害分析 → localhost:4000/analyze-logs
#### 3. 複雑システム問題 → localhost:4000/generate (premium)
#### 4. 緊急障害対応 → localhost:4000/generate (critical)

### 📋 実用的コマンド例

#### IT障害解析 (自動GPT-5昇格)
```bash
# MySQL障害の包括的解析
curl -X POST http://localhost:4000/analyze-logs \
  -H "Content-Type: application/json" \
  -d '{
    "user_command": "systemctl start postgresql",
    "error_output": "Job for mysqld.service failed. Connection refused on port 3306",
    "system_context": "Production database server"
  }' | jq '.analysis_result'
```

#### 高品質技術支援 (強制Claude Sonnet4)
```bash
# Pacemaker クラスタ問題の専門解析
curl -X POST http://localhost:4000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Pacemakerクラスタでstonithが正常に動作しません。pcs出力から解決策を分析してください",
    "task_type": "premium"
  }' | jq '.response'
```

#### 緊急障害対応 (強制Opus4.1)
```bash  
# 本番環境障害の最高品質対応
curl -X POST http://localhost:4000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "本番JobArrangerで全ジョブが停止。緊急復旧が必要です",
    "task_type": "critical"
  }' | jq '.response'
```

#### 会話継続 (コンテキスト自動継承)
```bash
# 同一conversation_idで追加質問
curl -X POST http://localhost:4000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "さらに詳しく説明してください",
    "conversation_id": "session_123",
    "task_type": "premium"
  }' | jq '.response'
```

## Portable Deployment Ready

このシステムは**techsapo**ブランチで管理され、以下の特徴を持ちます：
- **

### Complete Portability
- **環境変数管理**: 全API keyの外部設定対応
- **Docker対応**: フルコンテナ化サポート
- **PM2管理**: プロセス自動復旧・スケーリング
- **SSL自動対応**: 本番HTTPS証明書統合
