#!/usr/bin/env node

/**
 * 現代的PDF生成システム
 * 最新のPuppeteer + Mermaid + 高品質CSS/HTMLによるPDF生成
 * Context7の最新ベストプラクティスを適用
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');

// Dynamic imports for ESM modules
let marked, mermaid;

async function initializeModules() {
  try {
    const markedModule = await import('marked');
    marked = markedModule.marked;
    
    // Markedの設定
    marked.setOptions({
      gfm: true,
      breaks: true,
      headerIds: true,
      mangle: false,
      sanitize: false,
      tables: true,
      smartLists: true,
      smartypants: true
    });
    
    console.log('✅ Markdown processor initialized');
  } catch (error) {
    console.error('❌ Module initialization error:', error);
    throw error;
  }
}

// 高品質PDF設定
const PDF_CONFIG = {
  format: 'A4',
  margin: {
    top: '25mm',
    right: '20mm', 
    bottom: '25mm',
    left: '20mm'
  },
  printBackground: true,
  displayHeaderFooter: true,
  preferCSSPageSize: false,
  timeout: 120000, // 2分タイムアウト
  waitUntil: 'networkidle0'
};

// ドキュメント設定
const DOCUMENTS = [
  {
    input: "docs/BASIC_DESIGN_DETAILED.md",
    output: "docs/pdf/TechSapo_基本設計書_詳細版.pdf",
    title: "TechSapo 基本設計書 - 詳細版",
    description: "システム全体設計・アーキテクチャ・技術仕様",
    version: "2.0"
  },
  {
    input: "docs/BACKEND_DETAILED_DESIGN.md", 
    output: "docs/pdf/TechSapo_バックエンド詳細設計書.pdf",
    title: "TechSapo バックエンド詳細設計書",
    description: "サーバーサイド実装・API・データベース設計",
    version: "1.5"
  },
  {
    input: "docs/INTERFACE_SPECIFICATION.md",
    output: "docs/pdf/TechSapo_インターフェース仕様書.pdf", 
    title: "TechSapo インターフェース仕様書",
    description: "API仕様・通信プロトコル・データ形式",
    version: "1.3"
  },
  {
    input: "docs/BASIC_DESIGN.md",
    output: "docs/pdf/TechSapo_基本設計書.pdf",
    title: "TechSapo 基本設計書",
    description: "基本システム設計・概要仕様",
    version: "1.0"
  }
];

// 高品質CSS生成
function generateModernCSS() {
  return `
/* 現代的PDF CSS - 高品質印刷対応 */
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700;900&family=Source+Code+Pro:wght@400;500;600&display=swap');

:root {
  --primary-color: #2c3e50;
  --secondary-color: #3498db;
  --accent-color: #e74c3c;
  --success-color: #27ae60;
  --warning-color: #f39c12;
  --info-color: #8e44ad;
  --light-bg: #f8f9fa;
  --border-color: #e9ecef;
  --text-color: #2c3e50;
  --text-muted: #6c757d;
  --code-bg: #f1f3f4;
  --shadow: 0 2px 4px rgba(0,0,0,0.1);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif;
  font-size: 11pt;
  line-height: 1.7;
  color: var(--text-color);
  background: white;
  hyphens: auto;
  word-break: break-word;
  overflow-wrap: break-word;
}

/* ドキュメントヘッダー */
.document-header {
  text-align: center;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
  color: white;
  padding: 40px 30px;
  margin-bottom: 40px;
  border-radius: 8px;
  page-break-after: always;
  position: relative;
  overflow: hidden;
}

.document-header::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="2" fill="rgba(255,255,255,0.1)"/></svg>') repeat;
  animation: float 20s infinite linear;
}

.document-title {
  font-size: 28pt;
  font-weight: 900;
  margin: 0 0 15px 0;
  position: relative;
  z-index: 2;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.document-subtitle {
  font-size: 14pt;
  font-weight: 300;
  margin-bottom: 20px;
  opacity: 0.9;
  position: relative;
  z-index: 2;
}

.document-meta {
  font-size: 11pt;
  position: relative;
  z-index: 2;
  background: rgba(255,255,255,0.1);
  padding: 15px;
  border-radius: 6px;
  backdrop-filter: blur(10px);
}

.document-meta .meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
  text-align: left;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.meta-icon {
  width: 16px;
  height: 16px;
  background: var(--secondary-color);
  border-radius: 50%;
  display: inline-block;
}

/* 目次スタイル */
.toc {
  background: var(--light-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 25px;
  margin: 30px 0;
  page-break-inside: avoid;
}

.toc-title {
  font-size: 18pt;
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: 20px;
  border-bottom: 2px solid var(--secondary-color);
  padding-bottom: 10px;
}

.toc-list {
  list-style: none;
  padding: 0;
}

.toc-item {
  margin: 8px 0;
  padding: 5px 0;
  border-bottom: 1px dotted var(--border-color);
}

.toc-link {
  text-decoration: none;
  color: var(--text-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toc-link:hover {
  color: var(--secondary-color);
}

/* 見出しスタイル */
h1 {
  font-size: 22pt;
  font-weight: 700;
  color: var(--primary-color);
  margin: 40px 0 20px 0;
  padding: 15px 0;
  border-bottom: 3px solid var(--secondary-color);
  page-break-after: avoid;
  position: relative;
}

h1::before {
  content: counter(h1-counter);
  counter-increment: h1-counter;
  background: var(--secondary-color);
  color: white;
  padding: 5px 12px;
  border-radius: 4px;
  font-size: 14pt;
  margin-right: 15px;
  font-weight: 600;
}

h2 {
  font-size: 16pt;
  font-weight: 600;
  color: var(--primary-color);
  margin: 30px 0 15px 0;
  padding: 12px 0 12px 20px;
  border-left: 5px solid var(--secondary-color);
  background: linear-gradient(90deg, var(--light-bg) 0%, white 100%);
  page-break-after: avoid;
  position: relative;
}

h2::before {
  content: counter(h1-counter) "." counter(h2-counter);
  counter-increment: h2-counter;
  color: var(--secondary-color);
  font-weight: 700;
  margin-right: 10px;
}

h3 {
  font-size: 14pt;
  font-weight: 600;
  color: var(--primary-color);
  margin: 25px 0 12px 0;
  padding: 8px 0;
  border-bottom: 2px solid var(--border-color);
  page-break-after: avoid;
}

h4 {
  font-size: 12pt;
  font-weight: 600;
  color: var(--primary-color);
  margin: 20px 0 10px 0;
  page-break-after: avoid;
}

/* 段落・テキスト */
p {
  margin: 10px 0;
  text-align: justify;
  line-height: 1.7;
}

strong, b {
  font-weight: 700;
  color: var(--primary-color);
}

em, i {
  font-style: italic;
  color: var(--info-color);
}

/* リスト */
ul, ol {
  margin: 12px 0;
  padding-left: 25px;
}

li {
  margin: 6px 0;
  line-height: 1.6;
}

ul li::marker {
  color: var(--secondary-color);
}

ol li::marker {
  color: var(--secondary-color);
  font-weight: 600;
}

/* テーブル */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
  font-size: 10pt;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: var(--shadow);
  page-break-inside: avoid;
}

th {
  background: linear-gradient(135deg, var(--secondary-color) 0%, var(--primary-color) 100%);
  color: white;
  padding: 12px 8px;
  text-align: left;
  font-weight: 600;
  border: 1px solid rgba(255,255,255,0.2);
  position: relative;
}

td {
  padding: 10px 8px;
  border: 1px solid var(--border-color);
  vertical-align: top;
  line-height: 1.5;
}

tr:nth-child(even) {
  background-color: rgba(52, 152, 219, 0.05);
}

tr:hover {
  background-color: rgba(52, 152, 219, 0.1);
}

/* コードブロック */
pre {
  background: var(--code-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
  font-family: "Source Code Pro", "Monaco", "Menlo", monospace;
  font-size: 9pt;
  line-height: 1.5;
  overflow-x: auto;
  page-break-inside: avoid;
  position: relative;
  box-shadow: var(--shadow);
}

pre::before {
  content: attr(data-language);
  position: absolute;
  top: 8px;
  right: 15px;
  background: var(--secondary-color);
  color: white;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 8pt;
  font-weight: 500;
  text-transform: uppercase;
}

code {
  font-family: "Source Code Pro", "Monaco", "Menlo", monospace;
  font-size: 9pt;
  background: var(--code-bg);
  padding: 2px 6px;
  border-radius: 3px;
  border: 1px solid rgba(0,0,0,0.1);
}

/* Mermaid図表プレースホルダー */
.mermaid-diagram {
  background: linear-gradient(135deg, #e8f4f8 0%, #d5eaf2 100%);
  border: 2px solid var(--secondary-color);
  border-radius: 12px;
  padding: 25px;
  margin: 25px 0;
  text-align: center;
  page-break-inside: avoid;
  position: relative;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.mermaid-diagram::before {
  content: '📊';
  font-size: 32pt;
  margin-bottom: 10px;
  display: block;
}

.diagram-title {
  font-size: 14pt;
  font-weight: 600;
  color: var(--primary-color);
  margin-bottom: 8px;
}

.diagram-code {
  background: rgba(255,255,255,0.8);
  padding: 15px;
  border-radius: 6px;
  font-family: "Source Code Pro", monospace;
  font-size: 8pt;
  color: var(--text-muted);
  white-space: pre-wrap;
  max-height: 150px;
  overflow-y: auto;
  border: 1px solid rgba(0,0,0,0.1);
}

/* ブロッククォート */
blockquote {
  border-left: 5px solid var(--secondary-color);
  background: var(--light-bg);
  padding: 20px 20px 20px 25px;
  margin: 20px 0;
  font-style: italic;
  position: relative;
  border-radius: 0 8px 8px 0;
  box-shadow: var(--shadow);
}

blockquote::before {
  content: '"';
  font-size: 48pt;
  color: var(--secondary-color);
  position: absolute;
  top: -10px;
  left: 15px;
  opacity: 0.3;
}

/* リンク */
a {
  color: var(--secondary-color);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: all 0.3s ease;
}

a:hover {
  border-bottom-color: var(--secondary-color);
}

/* ページブレーク */
.page-break {
  page-break-before: always;
}

.no-break {
  page-break-inside: avoid;
}

/* カードスタイル */
.info-card {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
  box-shadow: var(--shadow);
  page-break-inside: avoid;
}

.warning-card {
  background: #fff8e1;
  border-left: 5px solid var(--warning-color);
  border-radius: 0 8px 8px 0;
}

.error-card {
  background: #ffebee;
  border-left: 5px solid var(--accent-color);
  border-radius: 0 8px 8px 0;
}

.success-card {
  background: #e8f5e8;
  border-left: 5px solid var(--success-color);
  border-radius: 0 8px 8px 0;
}

/* バッジ */
.badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 8pt;
  font-weight: 600;
  text-transform: uppercase;
  margin: 0 2px;
}

.badge-primary { background: var(--secondary-color); color: white; }
.badge-success { background: var(--success-color); color: white; }
.badge-warning { background: var(--warning-color); color: white; }
.badge-danger { background: var(--accent-color); color: white; }

/* 印刷用最適化 */
@media print {
  body {
    font-size: 10pt;
    line-height: 1.5;
  }
  
  .document-header {
    page-break-after: always;
  }
  
  h1, h2, h3, h4 {
    page-break-after: avoid;
  }
  
  pre, table, .mermaid-diagram, .info-card {
    page-break-inside: avoid;
  }
  
  tr {
    page-break-inside: avoid;
  }
  
  /* カウンターをリセット */
  body {
    counter-reset: h1-counter h2-counter h3-counter;
  }
  
  h1 {
    counter-reset: h2-counter h3-counter;
  }
  
  h2 {
    counter-reset: h3-counter;
  }
}

/* アニメーション */
@keyframes float {
  0% { transform: translateX(-100px) translateY(-100px); }
  100% { transform: translateX(100px) translateY(100px); }
}

/* レスポンシブ調整 */
@media screen and (max-width: 768px) {
  .document-meta .meta-grid {
    grid-template-columns: 1fr;
  }
}`;
}

// HTML テンプレート生成
function generateModernHTML(content, doc) {
  const css = generateModernCSS();
  const date = new Date();
  
  return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${doc.title}</title>
    <style>${css}</style>
</head>
<body>
    <div class="document-header">
        <h1 class="document-title">${doc.title}</h1>
        <p class="document-subtitle">${doc.description}</p>
        <div class="document-meta">
            <div class="meta-grid">
                <div class="meta-item">
                    <span class="meta-icon"></span>
                    <span>生成日: ${date.toLocaleDateString('ja-JP', { 
                      year: 'numeric', month: 'long', day: 'numeric' 
                    })}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-icon"></span>
                    <span>バージョン: ${doc.version}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-icon"></span>
                    <span>TechSapo Development Team</span>
                </div>
                <div class="meta-item">
                    <span class="meta-icon"></span>
                    <span>機密度: 社内専用</span>
                </div>
            </div>
        </div>
    </div>
    
    <div class="content">
        ${content}
    </div>
</body>
</html>`;
}

// マークダウン前処理 - 最新のベストプラクティス適用
function preprocessMarkdown(content) {
  // Mermaid図表の高品質プレースホルダー変換
  content = content.replace(/```mermaid\s*\n([\s\S]*?)\n```/g, (match, diagram) => {
    const lines = diagram.trim().split('\n');
    const diagramType = lines[0].trim();
    const firstLine = lines[1] || '';
    
    // 図表タイプを識別
    let diagramTitle = '';
    if (diagramType.includes('graph')) diagramTitle = 'システム構成図';
    else if (diagramType.includes('flowchart')) diagramTitle = 'フローチャート';
    else if (diagramType.includes('sequence')) diagramTitle = 'シーケンス図';
    else if (diagramType.includes('gantt')) diagramTitle = 'ガントチャート';
    else if (diagramType.includes('pie')) diagramTitle = '円グラフ';
    else if (diagramType.includes('mindmap')) diagramTitle = 'マインドマップ';
    else if (diagramType.includes('erDiagram')) diagramTitle = 'ER図';
    else diagramTitle = '図表';
    
    return `<div class="mermaid-diagram">
      <div class="diagram-title">${diagramTitle}</div>
      <div class="diagram-code">${diagram.trim()}</div>
    </div>`;
  });
  
  // ページブレークの処理
  content = content.replace(/<div style="page-break-after: always;"><\/div>/g, '<div class="page-break"></div>');
  
  // 情報ボックスの処理
  content = content.replace(/> \*\*(注意|警告|情報|成功):\*\*([\s\S]*?)(?=\n\n|\n(?!>))/g, (match, type, text) => {
    const cardClass = {
      '注意': 'warning-card',
      '警告': 'error-card', 
      '情報': 'info-card',
      '成功': 'success-card'
    }[type] || 'info-card';
    
    return `<div class="info-card ${cardClass}">
      <strong>${type}:</strong> ${text.replace(/^> /gm, '').trim()}
    </div>`;
  });
  
  // バッジの処理
  content = content.replace(/\*\*(必須|推奨|オプション|非推奨)\*\*/g, (match, text) => {
    const badgeClass = {
      '必須': 'badge-danger',
      '推奨': 'badge-success',
      'オプション': 'badge-primary',
      '非推奨': 'badge-warning'
    }[text] || 'badge-primary';
    
    return `<span class="badge ${badgeClass}">${text}</span>`;
  });
  
  return content;
}

// 高品質PDF生成
async function generateHighQualityPDF(htmlContent, outputPath, doc) {
  console.log(`📄 高品質PDF生成中: ${doc.title}`);
  
  const browser = await puppeteer.launch({
    product: 'firefox',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--headless'
    ],
    executablePath: '/usr/bin/firefox',
    env: {
      ...process.env,
      DISPLAY: ':99'
    }
  });
  
  try {
    const page = await browser.newPage();
    
    // 高解像度設定
    await page.setViewport({
      width: 1200,
      height: 1600,
      deviceScaleFactor: 2
    });
    
    // HTMLコンテンツを設定
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
      timeout: 60000
    });
    
    // フォント読み込み待機
    await page.evaluateHandle('document.fonts.ready');
    
    // PDF生成
    const buffer = await page.pdf({
      ...PDF_CONFIG,
      headerTemplate: `
        <div style="font-size: 9pt; color: #666; text-align: center; width: 100%; 
                    padding: 8px 0; border-bottom: 1px solid #eee; background: #f8f9fa;">
          <span style="font-weight: 500;">${doc.title}</span>
          <span style="margin-left: 20px; color: #999;">v${doc.version}</span>
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 9pt; color: #666; text-align: center; width: 100%; 
                    padding: 8px 0; border-top: 1px solid #eee; background: #f8f9fa;">
          <span>TechSapo Development Team</span>
          <span style="margin: 0 15px;">•</span>
          <span>ページ <span class="pageNumber"></span> / <span class="totalPages"></span></span>
          <span style="margin: 0 15px;">•</span>
          <span>${new Date().toLocaleDateString('ja-JP')}</span>
        </div>
      `
    });
    
    // ファイル書き込み
    fs.writeFileSync(outputPath, buffer);
    
    console.log(`✅ 高品質PDF生成完了: ${outputPath}`);
    
    // ファイルサイズ情報
    const stats = fs.statSync(outputPath);
    const sizeKB = Math.round(stats.size / 1024);
    console.log(`   📊 ファイルサイズ: ${sizeKB} KB`);
    
  } finally {
    await browser.close();
  }
}

// メイン処理
async function main() {
  console.log("🚀 現代的PDF生成システム開始...");
  console.log("📋 使用技術: Puppeteer + Marked + 高品質CSS/HTML");
  
  try {
    // モジュール初期化
    await initializeModules();
    
    // PDFディレクトリ作成
    const pdfDir = path.join(__dirname, "..", "docs", "pdf");
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
      console.log(`📁 PDFディレクトリ作成: ${pdfDir}`);
    }
    
    // 各ドキュメントを処理
    for (const doc of DOCUMENTS) {
      if (!fs.existsSync(doc.input)) {
        console.warn(`⚠️  ファイルが見つかりません: ${doc.input}`);
        continue;
      }
      
      console.log(`\n📖 処理開始: ${doc.title}`);
      
      // マークダウン読み込み
      const markdownContent = fs.readFileSync(doc.input, 'utf8');
      console.log(`   📄 マークダウン読み込み完了 (${markdownContent.length}文字)`);
      
      // 前処理
      const processedMarkdown = preprocessMarkdown(markdownContent);
      console.log(`   🔄 前処理完了`);
      
      // HTML変換
      const htmlContent = marked.parse(processedMarkdown);
      console.log(`   🌐 HTML変換完了`);
      
      // 完全なHTMLドキュメント生成
      const fullHTML = generateModernHTML(htmlContent, doc);
      console.log(`   📝 HTMLドキュメント生成完了`);
      
      // 高品質PDF生成
      await generateHighQualityPDF(fullHTML, doc.output, doc);
    }
    
    // 統合PDF作成
    console.log("\n📚 統合PDF作成中...");
    await createCombinedPDF(pdfDir);
    
    // 完了報告
    console.log("\n🎉 現代的PDF生成処理完了!");
    console.log(`📁 出力フォルダ: ${pdfDir}`);
    
    // 生成されたファイル一覧表示
    const files = fs.readdirSync(pdfDir).filter(f => f.endsWith('.pdf'));
    console.log("\n📋 生成されたPDFファイル:");
    files.forEach(file => {
      const filePath = path.join(pdfDir, file);
      const stats = fs.statSync(filePath);
      const sizeKB = Math.round(stats.size / 1024);
      const hash = createHash('md5').update(fs.readFileSync(filePath)).digest('hex').substring(0, 8);
      console.log(`  • ${file} (${sizeKB} KB, ${hash})`);
    });
    
    console.log("\n✨ 現代的PDF生成システムによる高品質ドキュメント作成完了");
    
  } catch (error) {
    console.error("❌ PDF生成エラー:", error);
    process.exit(1);
  }
}

// 統合PDF作成
async function createCombinedPDF(pdfDir) {
  // Note: この機能は将来的にPDF-libなどを使用して実装予定
  console.log("ℹ️  統合PDF機能は将来バージョンで実装予定");
}

// スクリプト実行
if (require.main === module) {
  main();
}

module.exports = { 
  generateHighQualityPDF, 
  generateModernHTML, 
  preprocessMarkdown,
  generateModernCSS
};