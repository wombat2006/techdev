import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { FOOTER } from './slide-data.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const THEME_CSS = readFileSync(join(__dirname, 'slides/theme.css'), 'utf-8');

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function bulletsHtml(items) {
  return `<ul class="bullets">${items.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`;
}

function tableHtml(headers, rows) {
  const th = headers.map((h) => `<th>${esc(h)}</th>`).join('');
  const tr = rows
    .map((row) => `<tr>${row.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
    .join('');
  return `<table class="data"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
}

function footerHtml(show = true) {
  return show ? `<div class="slide__footer">${esc(FOOTER)}</div>` : '';
}

function flowNode(label, sub, tone = '') {
  const cls = tone ? ` flow-node--${tone}` : '';
  return `<div class="flow-node${cls}">${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
}

function flowArrow() {
  return '<div class="flow-arrow">↓</div>';
}

function flowRight() {
  return '<div class="flow-arrow">→</div>';
}

const FLOWCHARTS = {
  overall: [
    flowNode('1. リクエスト受信', 'POST /wall-bounce/analyze · SSE', 'light'),
    flowArrow(),
    flowNode('2. 固定 Orchestrator', 'TaskGraph 分解 · 子タスク計画', 'primary'),
    flowArrow(),
    flowNode('3. Grounding Layer', 'Tier 0→3 並列 fetch → 優先度マージ', 'accent'),
    flowArrow(),
    flowNode('4. TaskRouter + Wall-Bounce', 'LLM 選択 · multi-LLM 協調実行', 'sky'),
    flowArrow(),
    flowNode('5. Hard Gate', 'confidence / consensus 閾値判定', 'orange'),
    flowArrow(),
    flowNode('6. Aggregator → 出力', 'citation 統合 · SSE ストリーム', 'green'),
  ].join('\n'),
  'wall-bounce': [
    flowNode('ユーザークエリ + Grounding Context', '', 'light'),
    flowArrow(),
    flowNode('TaskRouter', 'requiresWallBounce = true', 'primary'),
    flowArrow(),
    `<div class="flow-branch">${['Antigravity / Gemini 2.5 Pro', 'GPT-5 Codex', 'Claude Sonnet'].map((l) =>
      `<div class="flow-branch-col">${flowNode(l, '', 'sky')}</div>`,
    ).join('')}</div>`,
    flowArrow(),
    flowNode('Consensus Engine', 'agreement_score · 矛盾検出', 'accent'),
    flowArrow(),
    flowNode('Claude Opus Aggregator', '最終 synthesis + citation', 'primary'),
    flowArrow(),
    flowNode('Hard Gate → 出力 or abstain', '閾値未満は再実行 / 棄却', 'orange'),
  ].join('\n'),
  grounding: [
    flowNode('PromptAnalyzer + 専門辞書', 'クエリ正規化 · 用語展開', 'light'),
    flowArrow(),
    `<div class="flow-row">${[
      flowNode('Tier 0', 'e-Gov / 社内 DB', 'green'),
      flowNode('Tier 1', 'NDL / Context7', 'sky'),
      flowNode('Tier 2', '辞書 / Cipher', 'light'),
      flowNode('Tier 3', 'LLM 推論', 'orange'),
    ].join('')}</div>`,
    flowArrow(),
    flowNode('優先度マージ', 'Tier 0 矛盾 claim は出力禁止', 'accent'),
    flowArrow(),
    flowNode('Context Bundle', '全 LLM プロンプトへ共通注入', 'primary'),
  ].join('\n'),
  codegen: [
    flowNode('要件 / タスク', '', 'light'),
    flowArrow(),
    `<div class="flow-row">${[
      flowNode('Assist', '多 LLM 案', 'sky'),
      flowRight(),
      flowNode('Agent', 'Write/Edit', 'accent'),
      flowRight(),
      flowNode('Verified', 'test/lint/CI', 'green'),
    ].join('')}</div>`,
    flowArrow(),
    flowNode('Context7 + 社内規約 DB', 'API 正本 · lint gate', 'primary'),
    flowArrow(),
    flowNode('マージ / デプロイ', 'Verified のみ本番反映', 'green'),
  ].join('\n'),
};

export function slideToHtml(slide) {
  let body = '';

  switch (slide.type) {
    case 'title':
      body = `
<div class="slide slide--primary slide-title">
  <div class="eyebrow">${esc(slide.eyebrow)}</div>
  <h1>${esc(slide.title)}</h1>
  <p class="subtitle">${slide.subtitle.split('\n').map(esc).join('<br>')}</p>
  <p class="meta">${esc(slide.meta)}</p>
</div>`;
      break;

    case 'section':
      body = `
<div class="slide slide--accent slide-section">
  <h2>${esc(slide.title)}</h2>
  ${slide.subtitle ? `<p>${esc(slide.subtitle)}</p>` : ''}
</div>`;
      break;

    case 'content': {
      const theme = slide.theme === 'light' ? ' slide--light' : '';
      body = `
<div class="slide slide-content${theme}">
  <header class="slide__head"><h2>${esc(slide.title)}</h2></header>
  <div class="slide__main">
    ${bulletsHtml(slide.bullets)}
    ${slide.note ? `<p class="slide__note">${esc(slide.note)}</p>` : ''}
  </div>
  ${footerHtml()}
</div>`;
      break;
    }

    case 'two-col':
      body = `
<div class="slide slide-content slide-two-col">
  <header class="slide__head"><h2>${esc(slide.title)}</h2></header>
  <div class="slide__main">
    <div class="col">
      <h3>${esc(slide.leftTitle)}</h3>
      ${bulletsHtml(slide.left)}
    </div>
    <div class="col">
      <h3>${esc(slide.rightTitle)}</h3>
      ${bulletsHtml(slide.right)}
    </div>
  </div>
  ${footerHtml()}
</div>`;
      break;

    case 'table':
      body = `
<div class="slide slide-content slide-table">
  <header class="slide__head"><h2>${esc(slide.title)}</h2></header>
  <div class="slide__main">
    ${tableHtml(slide.headers, slide.rows)}
  </div>
  ${footerHtml()}
</div>`;
      break;

    case 'flowchart':
      body = `
<div class="slide slide-content slide-flowchart">
  <header class="slide__head"><h2>${esc(slide.title)}</h2></header>
  <div class="slide__main">
    ${FLOWCHARTS[slide.variant] || ''}
    ${slide.note ? `<p class="slide__note">${esc(slide.note)}</p>` : ''}
  </div>
  ${footerHtml()}
</div>`;
      break;

    case 'closing':
      body = `
<div class="slide slide--primary slide-closing">
  <h2>${esc(slide.title)}</h2>
  <p class="tagline">${esc(slide.tagline)}</p>
  <p class="team">${esc(slide.team)}</p>
</div>`;
      break;

    default:
      throw new Error(`Unknown slide type: ${slide.type}`);
  }

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<style>${THEME_CSS}</style>
</head>
<body>${body}</body>
</html>`;
}
