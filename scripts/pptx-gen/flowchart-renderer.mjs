import { TYPE } from './typography.mjs';

const COLORS = {
  primary: '#1A365D',
  accent: '#2B6CB0',
  light: '#F7FAFC',
  text: '#2D3748',
  muted: '#718096',
  border: '#E2E8F0',
  white: '#FFFFFF',
  sky: '#4299E1',
  green: '#276749',
  greenBg: '#C6F6D5',
  orange: '#C05621',
  orangeBg: '#FEEBC8',
};

const NODE_COLORS = {
  primary: { bg: COLORS.primary, fg: COLORS.white },
  accent: { bg: COLORS.accent, fg: COLORS.white },
  light: { bg: COLORS.light, fg: COLORS.text, border: COLORS.border },
  sky: { bg: '#EBF8FF', fg: COLORS.primary, border: COLORS.sky },
  green: { bg: COLORS.greenBg, fg: COLORS.green, border: COLORS.green },
  orange: { bg: COLORS.orangeBg, fg: COLORS.orange, border: COLORS.orange },
};

function el(type, props, ...children) {
  const flat = children.flat().filter((c) => c !== null && c !== false && c !== '');
  return {
    type,
    props: {
      ...props,
      children: flat.length <= 1 ? flat[0] ?? null : flat,
    },
  };
}

function text(s) {
  return String(s);
}

function flowNode(label, { sub, tone = 'primary', width, minWidth = 200 } = {}) {
  const c = NODE_COLORS[tone] || NODE_COLORS.primary;
  const lines = sub ? `${text(label)}\n${text(sub)}` : text(label);
  const style = {
    backgroundColor: c.bg,
    color: c.fg,
    padding: '16px 22px',
    borderRadius: 14,
    border: c.border ? `2px solid ${c.border}` : 'none',
    fontSize: TYPE.flowLabel,
    fontFamily: 'Noto Sans JP',
    textAlign: 'center',
    minWidth,
    fontWeight: 700,
    lineHeight: 1.4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    whiteSpace: 'pre-line',
  };
  if (width) style.width = width;
  return el('div', { style }, lines);
}

function arrow(dir = 'down') {
  const sym = dir === 'down' ? '↓' : dir === 'right' ? '→' : '←';
  const isVert = dir === 'down' || dir === 'up';
  return el('div', {
    style: {
      fontSize: TYPE.flowArrow,
      color: COLORS.accent,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: isVert ? 48 : 40,
      height: isVert ? 36 : 48,
      fontFamily: 'Noto Sans JP',
      fontWeight: 700,
      flexShrink: 0,
    },
  }, sym);
}

function row(...items) {
  return el('div', {
    style: { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  }, ...items);
}

function col(...items) {
  return el('div', {
    style: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  }, ...items);
}

function branchRow(nodes) {
  return el('div', {
    style: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
  }, ...nodes.map((n, i) => el('div', {
    style: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginLeft: i ? 20 : 0 },
  }, n.node, n.down ? arrow('down') : null)));
}

/** 縦パイプライン */
export function renderPipeline(steps) {
  return col(
    ...steps.flatMap((step, i) => {
      const node = flowNode(step.label, { sub: step.sub, tone: step.tone, minWidth: step.minWidth || 520 });
      return i < steps.length - 1 ? [node, arrow('down')] : [node];
    }),
  );
}

/** 全体処理フロー（6ステップ縦型） */
export function renderOverallFlow() {
  return renderPipeline([
    { label: '1. リクエスト受信', sub: 'POST /wall-bounce/analyze · SSE', tone: 'light', minWidth: 580 },
    { label: '2. 固定 Orchestrator', sub: 'TaskGraph 分解 · 子タスク計画', tone: 'primary', minWidth: 580 },
    { label: '3. Grounding Layer', sub: 'Tier 0→3 並列 fetch → 優先度マージ', tone: 'accent', minWidth: 580 },
    { label: '4. TaskRouter + Wall-Bounce', sub: 'LLM 選択 · multi-LLM 協調実行', tone: 'sky', minWidth: 580 },
    { label: '5. Hard Gate', sub: 'confidence / consensus 閾値判定', tone: 'orange', minWidth: 580 },
    { label: '6. Aggregator → 出力', sub: 'citation 統合 · SSE ストリーム', tone: 'green', minWidth: 580 },
  ]);
}

/** Wall-Bounce 並列協調 */
export function renderWallBounceFlow() {
  return col(
    flowNode('ユーザークエリ + Grounding Context', { tone: 'light', minWidth: 640 }),
    arrow('down'),
    flowNode('TaskRouter', { sub: 'requiresWallBounce = true', tone: 'primary', minWidth: 320 }),
    arrow('down'),
    branchRow([
      { node: flowNode('Gemini 2.5 Pro', { sub: '分析 · 調査', tone: 'sky', minWidth: 200 }) },
      { node: flowNode('GPT-5 Codex', { sub: 'コード · 設計', tone: 'sky', minWidth: 200 }) },
      { node: flowNode('Claude Sonnet', { sub: '編集 · 統合', tone: 'sky', minWidth: 200 }) },
    ]),
    arrow('down'),
    flowNode('Consensus Engine', { sub: 'agreement_score · 矛盾検出', tone: 'accent', minWidth: 480 }),
    arrow('down'),
    flowNode('Claude Opus Aggregator', { sub: '最終 synthesis + citation', tone: 'primary', minWidth: 480 }),
    arrow('down'),
    flowNode('Hard Gate → 出力 or abstain', { sub: '閾値未満は再実行 / 棄却', tone: 'orange', minWidth: 480 }),
  );
}

/** Grounding Tier 統合 */
export function renderGroundingFlow() {
  return col(
    flowNode('PromptAnalyzer + 専門辞書', { sub: 'クエリ正規化 · 用語展開', tone: 'light', minWidth: 560 }),
    arrow('down'),
    el('div', {
      style: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
      },
    }, [
      flowNode('Tier 0', { sub: 'e-Gov / 社内 DB', tone: 'green', minWidth: 180 }),
      flowNode('Tier 1', { sub: 'NDL / Context7', tone: 'sky', minWidth: 180 }),
      flowNode('Tier 2', { sub: '辞書 / Cipher', tone: 'light', minWidth: 180 }),
      flowNode('Tier 3', { sub: 'LLM 推論', tone: 'orange', minWidth: 180 }),
    ]),
    arrow('down'),
    flowNode('優先度マージ', { sub: 'Tier 0 矛盾 claim は出力禁止', tone: 'accent', minWidth: 520 }),
    arrow('down'),
    flowNode('Context Bundle', { sub: '全 LLM プロンプトへ共通注入', tone: 'primary', minWidth: 520 }),
  );
}

/** コード生成 Verified フロー */
export function renderCodegenFlow() {
  return col(
    flowNode('要件 / タスク', { tone: 'light', minWidth: 400 }),
    arrow('down'),
    row(
      flowNode('Assist', { sub: '多 LLM 案', tone: 'sky', minWidth: 180 }),
      arrow('right'),
      flowNode('Agent', { sub: 'Write/Edit', tone: 'accent', minWidth: 180 }),
      arrow('right'),
      flowNode('Verified', { sub: 'test/lint/CI', tone: 'green', minWidth: 180 }),
    ),
    arrow('down'),
    flowNode('Context7 + 社内規約 DB', { sub: 'API 正本 · lint gate', tone: 'primary', minWidth: 560 }),
    arrow('down'),
    flowNode('マージ / デプロイ', { sub: 'Verified のみ本番反映', tone: 'green', minWidth: 400 }),
  );
}

export function renderFlowchart(variant) {
  switch (variant) {
    case 'overall': return renderOverallFlow();
    case 'wall-bounce': return renderWallBounceFlow();
    case 'grounding': return renderGroundingFlow();
    case 'codegen': return renderCodegenFlow();
    default:
      throw new Error(`Unknown flowchart variant: ${variant}`);
  }
}
