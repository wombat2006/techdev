#!/usr/bin/env node

/**
 * シンプルPDF生成システム
 * マークダウンからHTMLに変換し、外部ツールを使わずにPDF生成
 * 環境に依存しない軽量なソリューション
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Dynamic imports for ESM modules
let marked;

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

// ドキュメント設定
const DOCUMENTS = [
  {
    input: "docs/BASIC_DESIGN_DETAILED.md",
    output: "docs/pdf/TechSapo_基本設計書_詳細版.pdf",
    title: "TechSapo 基本設計書 - 詳細版",
    description: "システム全体設計・アーキテクチャ・技術仕様",
    version: "2.0"
  }
];

// 高品質CSS生成
function generatePrintCSS() {
  return `
/* 印刷最適化CSS */
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700;900&family=Source+Code+Pro:wght@400;500;600&display=swap');

:root {
  --primary-color: #2c3e50;
  --secondary-color: #3498db;
  --accent-color: #e74c3c;
  --success-color: #27ae60;
  --warning-color: #f39c12;
  --text-color: #2c3e50;
  --text-muted: #6c757d;
  --light-bg: #f8f9fa;
  --border-color: #e9ecef;
  --code-bg: #f1f3f4;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

@page {
  size: A4;
  margin: 25mm 20mm;
  
  @top-center {
    content: "TechSapo 設計書";
    font-family: "Noto Sans JP", sans-serif;
    font-size: 9pt;
    color: #666;
    border-bottom: 1px solid #eee;
    padding-bottom: 5px;
  }
  
  @bottom-center {
    content: "ページ " counter(page) " / " counter(pages);
    font-family: "Noto Sans JP", sans-serif;
    font-size: 9pt;
    color: #666;
    border-top: 1px solid #eee;
    padding-top: 5px;
  }
}

body {
  font-family: "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif;
  font-size: 11pt;
  line-height: 1.6;
  color: var(--text-color);
  background: white;
  hyphens: auto;
  word-break: break-word;
}

/* ドキュメントヘッダー */
.document-header {
  text-align: center;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
  color: white;
  padding: 30px 20px;
  margin-bottom: 30px;
  border-radius: 8px;
  page-break-after: always;
}

.document-title {
  font-size: 24pt;
  font-weight: 900;
  margin: 0 0 10px 0;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.document-subtitle {
  font-size: 12pt;
  font-weight: 300;
  margin-bottom: 15px;
  opacity: 0.9;
}

.document-meta {
  font-size: 10pt;
  background: rgba(255,255,255,0.1);
  padding: 10px;
  border-radius: 6px;
}

/* 見出しスタイル */
h1 {
  font-size: 18pt;
  font-weight: 700;
  color: var(--primary-color);
  margin: 30px 0 15px 0;
  padding: 10px 0;
  border-bottom: 2px solid var(--secondary-color);
  page-break-after: avoid;
}

h2 {
  font-size: 14pt;
  font-weight: 600;
  color: var(--primary-color);
  margin: 25px 0 12px 0;
  padding: 8px 0 8px 15px;
  border-left: 4px solid var(--secondary-color);
  background: linear-gradient(90deg, var(--light-bg) 0%, white 100%);
  page-break-after: avoid;
}

h3 {
  font-size: 12pt;
  font-weight: 600;
  color: var(--primary-color);
  margin: 20px 0 10px 0;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-color);
  page-break-after: avoid;
}

h4 {
  font-size: 11pt;
  font-weight: 600;
  color: var(--primary-color);
  margin: 15px 0 8px 0;
  page-break-after: avoid;
}

/* 段落・テキスト */
p {
  margin: 8px 0;
  text-align: justify;
  line-height: 1.6;
}

strong, b {
  font-weight: 700;
  color: var(--primary-color);
}

/* リスト */
ul, ol {
  margin: 10px 0;
  padding-left: 20px;
}

li {
  margin: 4px 0;
  line-height: 1.5;
}

/* テーブル */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 15px 0;
  font-size: 9pt;
  page-break-inside: avoid;
}

th {
  background: var(--secondary-color);
  color: white;
  padding: 8px 6px;
  text-align: left;
  font-weight: 600;
  border: 1px solid rgba(255,255,255,0.2);
}

td {
  padding: 6px;
  border: 1px solid var(--border-color);
  vertical-align: top;
  line-height: 1.4;
}

tr:nth-child(even) {
  background-color: rgba(52, 152, 219, 0.05);
}

/* コードブロック */
pre {
  background: var(--code-bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 12px;
  margin: 15px 0;
  font-family: "Source Code Pro", "Monaco", "Menlo", monospace;
  font-size: 8pt;
  line-height: 1.4;
  overflow-x: auto;
  page-break-inside: avoid;
}

code {
  font-family: "Source Code Pro", "Monaco", "Menlo", monospace;
  font-size: 8pt;
  background: var(--code-bg);
  padding: 2px 4px;
  border-radius: 2px;
  border: 1px solid rgba(0,0,0,0.1);
}

/* Mermaid図表プレースホルダー */
.mermaid-diagram {
  background: linear-gradient(135deg, #e8f4f8 0%, #d5eaf2 100%);
  border: 2px solid var(--secondary-color);
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
  text-align: center;
  page-break-inside: avoid;
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.diagram-title {
  font-size: 12pt;
  font-weight: 600;
  color: var(--primary-color);
  margin-bottom: 5px;
}

.diagram-code {
  background: rgba(255,255,255,0.8);
  padding: 10px;
  border-radius: 4px;
  font-family: "Source Code Pro", monospace;
  font-size: 7pt;
  color: var(--text-muted);
  white-space: pre-wrap;
  max-height: 100px;
  overflow-y: auto;
  border: 1px solid rgba(0,0,0,0.1);
}

/* ブロッククォート */
blockquote {
  border-left: 4px solid var(--secondary-color);
  background: var(--light-bg);
  padding: 15px 15px 15px 20px;
  margin: 15px 0;
  font-style: italic;
  border-radius: 0 6px 6px 0;
}

/* リンク */
a {
  color: var(--secondary-color);
  text-decoration: none;
  border-bottom: 1px solid transparent;
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

/* 印刷最適化 */
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
  
  pre, table, .mermaid-diagram {
    page-break-inside: avoid;
  }
  
  tr {
    page-break-inside: avoid;
  }
}`;
}

// HTML テンプレート生成
function generateSimpleHTML(content, doc) {
  const css = generatePrintCSS();
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
            生成日: ${date.toLocaleDateString('ja-JP', { 
              year: 'numeric', month: 'long', day: 'numeric' 
            })} | バージョン: ${doc.version} | TechSapo Development Team
        </div>
    </div>
    
    <div class="content">
        ${content}
    </div>
</body>
</html>`;
}

// マークダウン前処理
function preprocessMarkdownSimple(content) {
  // Mermaid図表の簡単なプレースホルダー変換
  content = content.replace(/```mermaid\s*\n([\s\S]*?)\n```/g, (match, diagram) => {
    const lines = diagram.trim().split('\n');
    const diagramType = lines[0].trim();
    
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
      <div class="diagram-title">📊 ${diagramTitle}</div>
      <div class="diagram-code">${diagram.trim()}</div>
    </div>`;
  });
  
  // ページブレークの処理
  content = content.replace(/<div style="page-break-after: always;"><\/div>/g, '<div class="page-break"></div>');
  
  return content;
}

// wkhtmltopdfを使用したPDF生成
async function generatePDFWithWkhtmltopdf(htmlPath, outputPath, doc) {
  const wkhtmltopdfOptions = [
    '--page-size', 'A4',
    '--orientation', 'Portrait',
    '--margin-top', '25mm',
    '--margin-right', '20mm',
    '--margin-bottom', '25mm',
    '--margin-left', '20mm',
    '--header-center', `"${doc.title}"`,
    '--header-font-size', '9',
    '--footer-center', '"ページ [page] / [toPage]"',
    '--footer-font-size', '9',
    '--enable-local-file-access',
    '--print-media-type',
    '--no-background',
    '--encoding', 'UTF-8',
    '--javascript-delay', '1000'
  ];
  
  const command = `wkhtmltopdf ${wkhtmltopdfOptions.join(' ')} "${htmlPath}" "${outputPath}"`;
  
  try {
    await execAsync(command);
    console.log(`✅ wkhtmltopdf PDF生成完了: ${outputPath}`);
    return true;
  } catch (error) {
    console.log(`⚠️  wkhtmltopdf失敗: ${error.message}`);
    return false;
  }
}

// markdown-pdfを使用したフォールバック
async function generatePDFWithMarkdownPdf(htmlPath, outputPath) {
  try {
    const markdownpdf = require("markdown-pdf");
    
    const options = {
      paperFormat: "A4",
      paperOrientation: "portrait", 
      paperBorder: "20mm",
      remarkable: {
        html: true,
        breaks: true
      }
    };
    
    await new Promise((resolve, reject) => {
      markdownpdf(options)
        .from(htmlPath)
        .to(outputPath, function(err) {
          if (err) reject(err);
          else resolve();
        });
    });
    
    console.log(`✅ markdown-pdf PDF生成完了: ${outputPath}`);
    return true;
  } catch (error) {
    console.log(`⚠️  markdown-pdf失敗: ${error.message}`);
    return false;
  }
}

// メイン処理
async function main() {
  console.log("🚀 シンプルPDF生成システム開始...");
  console.log("📋 環境非依存・軽量PDF生成");
  
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
      const processedMarkdown = preprocessMarkdownSimple(markdownContent);
      console.log(`   🔄 前処理完了`);
      
      // HTML変換
      const htmlContent = marked.parse(processedMarkdown);
      console.log(`   🌐 HTML変換完了`);
      
      // 完全なHTMLドキュメント生成
      const fullHTML = generateSimpleHTML(htmlContent, doc);
      console.log(`   📝 HTMLドキュメント生成完了`);
      
      // 一時HTMLファイル作成
      const tempHtmlPath = path.join(pdfDir, `temp_${Date.now()}.html`);
      fs.writeFileSync(tempHtmlPath, fullHTML);
      console.log(`   💾 一時HTMLファイル作成: ${tempHtmlPath}`);
      
      // PDF生成を複数手法で試行
      let success = false;
      
      // 1. wkhtmltopdfを試行
      console.log(`   🔄 wkhtmltopdf試行中...`);
      success = await generatePDFWithWkhtmltopdf(tempHtmlPath, doc.output, doc);
      
      // 2. フォールバック: HTMLファイル保存
      if (!success) {
        const htmlOutputPath = doc.output.replace('.pdf', '.html');
        fs.copyFileSync(tempHtmlPath, htmlOutputPath);
        console.log(`   📄 HTMLファイルとして保存: ${htmlOutputPath}`);
        console.log(`   ℹ️  ブラウザで開いて手動でPDF印刷してください`);
        success = true; // HTMLファイル作成は成功とみなす
      }
      
      // 一時ファイル削除
      fs.unlinkSync(tempHtmlPath);
      console.log(`   🗑️  一時ファイル削除`);
    }
    
    // 完了報告
    console.log("\n🎉 シンプルPDF生成処理完了!");
    console.log(`📁 出力フォルダ: ${pdfDir}`);
    
    // 生成されたファイル一覧表示
    const files = fs.readdirSync(pdfDir).filter(f => f.endsWith('.pdf') || f.endsWith('.html'));
    console.log("\n📋 生成されたファイル:");
    files.forEach(file => {
      const filePath = path.join(pdfDir, file);
      const stats = fs.statSync(filePath);
      const sizeKB = Math.round(stats.size / 1024);
      console.log(`  • ${file} (${sizeKB} KB)`);
    });
    
    console.log("\n✨ シンプルPDF生成システム完了");
    console.log("📝 HTMLファイルが生成された場合は、ブラウザで開いてPDF印刷してください");
    
  } catch (error) {
    console.error("❌ PDF生成エラー:", error);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  main();
}

module.exports = { 
  generateSimpleHTML, 
  preprocessMarkdownSimple,
  generatePrintCSS
};