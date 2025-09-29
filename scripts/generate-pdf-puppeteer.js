#!/usr/bin/env node

/**
 * Puppeteer PDF生成スクリプト
 * MarkdownをHTMLに変換してからPDFを生成
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
// Dynamic import for marked ESM module
let marked;

// マークダウン変換設定を初期化する関数
async function initializeMarked() {
  const markedModule = await import('marked');
  marked = markedModule.marked;
  
  marked.setOptions({
    gfm: true,
    breaks: true,
    headerIds: true,
    mangle: false
  });
}

// 生成対象ドキュメント
const documents = [
  {
    input: "docs/BASIC_DESIGN.md",
    output: "docs/pdf/TechSapo_基本設計書.pdf",
    title: "TechSapo 基本設計書"
  },
  {
    input: "docs/BACKEND_DETAILED_DESIGN.md", 
    output: "docs/pdf/TechSapo_バックエンド詳細設計書.pdf",
    title: "TechSapo バックエンド詳細設計書"
  },
  {
    input: "docs/INTERFACE_SPECIFICATION.md",
    output: "docs/pdf/TechSapo_インターフェース仕様書.pdf", 
    title: "TechSapo インターフェース仕様書"
  }
];

// HTMLテンプレート生成
function generateHTML(content, title) {
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&display=swap');
        
        * {
            box-sizing: border-box;
        }
        
        body {
            font-family: "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif;
            font-size: 12pt;
            line-height: 1.6;
            color: #333;
            background: white;
            margin: 0;
            padding: 20px;
            max-width: 210mm;
            margin: 0 auto;
        }
        
        .document-header {
            text-align: center;
            border-bottom: 3px solid #3498db;
            padding-bottom: 20px;
            margin-bottom: 30px;
            page-break-after: avoid;
        }
        
        .document-title {
            font-size: 28pt;
            font-weight: bold;
            color: #2c3e50;
            margin: 0 0 10px 0;
        }
        
        .document-info {
            font-size: 11pt;
            color: #7f8c8d;
            margin-top: 15px;
        }
        
        h1 {
            font-size: 20pt;
            font-weight: bold;
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 8px;
            margin: 30px 0 15px 0;
            page-break-after: avoid;
        }
        
        h2 {
            font-size: 16pt;
            font-weight: bold;
            color: #34495e;
            border-left: 4px solid #3498db;
            padding-left: 12px;
            margin: 25px 0 12px 0;
            page-break-after: avoid;
        }
        
        h3 {
            font-size: 14pt;
            font-weight: bold;
            color: #34495e;
            margin: 20px 0 10px 0;
            page-break-after: avoid;
        }
        
        h4 {
            font-size: 12pt;
            font-weight: bold;
            color: #34495e;
            margin: 15px 0 8px 0;
            page-break-after: avoid;
        }
        
        p {
            margin: 8px 0;
            text-align: justify;
        }
        
        ul, ol {
            margin: 8px 0;
            padding-left: 20px;
        }
        
        li {
            margin: 3px 0;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 10pt;
            page-break-inside: avoid;
        }
        
        th {
            background-color: #3498db;
            color: white;
            padding: 8px;
            text-align: left;
            font-weight: bold;
            border: 1px solid #2980b9;
        }
        
        td {
            padding: 6px 8px;
            border: 1px solid #bdc3c7;
            vertical-align: top;
        }
        
        tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        
        pre {
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 4px;
            padding: 12px;
            margin: 15px 0;
            font-family: "Source Code Pro", "Monaco", "Menlo", monospace;
            font-size: 9pt;
            line-height: 1.4;
            overflow-x: auto;
            page-break-inside: avoid;
        }
        
        code {
            font-family: "Source Code Pro", "Monaco", "Menlo", monospace;
            font-size: 9pt;
            background-color: #f1f2f6;
            padding: 2px 4px;
            border-radius: 2px;
        }
        
        .mermaid-placeholder {
            background-color: #e8f4f8;
            border: 2px dashed #3498db;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
            color: #2c3e50;
            font-weight: bold;
            page-break-inside: avoid;
        }
        
        blockquote {
            border-left: 4px solid #3498db;
            padding-left: 15px;
            margin: 15px 0;
            font-style: italic;
            background-color: #f8f9fa;
            padding: 12px 12px 12px 20px;
            border-radius: 0 4px 4px 0;
        }
        
        strong, b {
            font-weight: bold;
            color: #2c3e50;
        }
        
        a {
            color: #3498db;
            text-decoration: none;
        }
        
        .page-break {
            page-break-before: always;
        }
        
        .no-break {
            page-break-inside: avoid;
        }
        
        @media print {
            body {
                font-size: 11pt;
            }
            
            .document-header {
                page-break-after: always;
            }
            
            h1, h2, h3, h4 {
                page-break-after: avoid;
            }
            
            pre, table, .mermaid-placeholder {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="document-header">
        <h1 class="document-title">${title}</h1>
        <div class="document-info">
            生成日: ${new Date().toLocaleDateString('ja-JP')}<br>
            バージョン: 1.0<br>
            TechSapo Development Team
        </div>
    </div>
    
    <div class="content">
        ${content}
    </div>
</body>
</html>`;
}

// マークダウン前処理
function preprocessMarkdown(content) {
  // Mermaid図表をプレースホルダーに変換
  content = content.replace(/```mermaid\n([\s\S]*?)\n```/g, (match, diagram) => {
    const diagramType = diagram.split('\n')[0].trim();
    return `<div class="mermaid-placeholder">📊 ${diagramType} 図表<br><small>原文: ${diagram.substring(0, 100)}...</small></div>`;
  });
  
  return content;
}

// PDF生成関数
async function generatePDF(htmlContent, outputPath, title) {
  console.log(`📄 PDF生成中: ${title}`);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/firefox',
    product: 'firefox',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-gpu'
    ]
  });
  
  try {
    const page = await browser.newPage();
    
    // HTMLコンテンツを設定
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // PDF生成
    await page.pdf({
      path: outputPath,
      format: 'A4',
      margin: {
        top: '2cm',
        right: '2cm',
        bottom: '2cm',
        left: '2cm'
      },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size: 10px; color: #666; text-align: center; width: 100%; margin-top: 10px;">
          ${title}
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 10px; color: #666; text-align: center; width: 100%; margin-bottom: 10px;">
          <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>
      `,
      timeout: 60000
    });
    
    console.log(`✅ PDF生成完了: ${outputPath}`);
    
  } finally {
    await browser.close();
  }
}

// メイン処理
async function main() {
  console.log("🚀 Puppeteer PDF生成開始...");
  
  // marked ESモジュールを初期化
  await initializeMarked();
  
  // PDFディレクトリ作成
  const pdfDir = path.join(__dirname, "..", "docs", "pdf");
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true });
  }
  
  try {
    // 各ドキュメントを処理
    for (const doc of documents) {
      if (!fs.existsSync(doc.input)) {
        console.warn(`⚠️  ファイルが見つかりません: ${doc.input}`);
        continue;
      }
      
      // マークダウン読み込み
      const markdownContent = fs.readFileSync(doc.input, 'utf8');
      
      // 前処理
      const processedMarkdown = preprocessMarkdown(markdownContent);
      
      // HTML変換
      const htmlContent = marked.parse(processedMarkdown);
      
      // 完全なHTMLドキュメント生成
      const fullHTML = generateHTML(htmlContent, doc.title);
      
      // PDF生成
      await generatePDF(fullHTML, doc.output, doc.title);
    }
    
    console.log("\n🎉 PDF生成処理完了!");
    console.log(`📁 出力フォルダ: ${pdfDir}`);
    
    // 生成されたファイル一覧表示
    const files = fs.readdirSync(pdfDir).filter(f => f.endsWith('.pdf'));
    console.log("\n📋 生成されたPDFファイル:");
    files.forEach(file => {
      const filePath = path.join(pdfDir, file);
      const stats = fs.statSync(filePath);
      const sizeKB = Math.round(stats.size / 1024);
      console.log(`  • ${file} (${sizeKB} KB)`);
    });
    
  } catch (error) {
    console.error("❌ PDF生成エラー:", error);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  main();
}

module.exports = { generatePDF, generateHTML, preprocessMarkdown };