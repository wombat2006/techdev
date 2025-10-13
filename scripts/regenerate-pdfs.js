#!/usr/bin/env node

/**
 * PDF再生成スクリプト
 * API_ENDPOINTS.pdf と GEMINI_MODELS_COMPARISON.pdf を正しいレイアウトで再生成
 */

const { mdToPdf } = require('md-to-pdf');
const fs = require('fs');
const path = require('path');

// PDF生成対象ドキュメント
const DOCUMENTS = [
  {
    input: path.join(__dirname, '..', 'docs', 'API_ENDPOINTS.md'),
    output: path.join(__dirname, '..', 'docs', 'API_ENDPOINTS.pdf'),
    title: 'TechSapo API エンドポイント一覧',
    language: 'ja'
  },
  {
    input: path.join(__dirname, '..', 'docs', 'GEMINI_MODELS_COMPARISON.md'),
    output: path.join(__dirname, '..', 'docs', 'GEMINI_MODELS_COMPARISON.pdf'),
    title: 'Gemini Models Performance Comparison',
    language: 'en'
  }
];

// PDF設定オプション
function getPdfOptions(doc) {
  return {
    dest: doc.output,
    pdf_options: {
      format: 'A4',
      margin: {
        top: '25mm',
        right: '20mm',
        bottom: '25mm',
        left: '20mm'
      },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size: 9pt; color: #666; text-align: center; width: 100%;
                    padding: 8px 20px; border-bottom: 1px solid #eee; background: #f8f9fa;">
          <span style="font-weight: 500;">${doc.title}</span>
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 9pt; color: #666; text-align: center; width: 100%;
                    padding: 8px 20px; border-top: 1px solid #eee; background: #f8f9fa;">
          <span>TechSapo Development Team</span>
          <span style="margin: 0 15px;">•</span>
          <span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span>
          <span style="margin: 0 15px;">•</span>
          <span>${new Date().toLocaleDateString(doc.language === 'ja' ? 'ja-JP' : 'en-US')}</span>
        </div>
      `
    },
    stylesheet: `
      /* 高品質PDF CSS */
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&family=Noto+Sans:wght@300;400;500;700&family=Source+Code+Pro:wght@400;500;600&display=swap');

      :root {
        --primary-color: #2c3e50;
        --secondary-color: #3498db;
        --accent-color: #e74c3c;
        --success-color: #27ae60;
        --warning-color: #f39c12;
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
        font-family: ${doc.language === 'ja'
          ? '"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif'
          : '"Noto Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'};
        font-size: 11pt;
        line-height: 1.7;
        color: var(--text-color);
        background: white;
        hyphens: auto;
        word-break: break-word;
        overflow-wrap: break-word;
      }

      /* 見出しスタイル */
      h1 {
        font-size: 24pt;
        font-weight: 700;
        color: var(--primary-color);
        margin: 30px 0 20px 0;
        padding: 15px 0;
        border-bottom: 3px solid var(--secondary-color);
        page-break-after: avoid;
      }

      h2 {
        font-size: 18pt;
        font-weight: 600;
        color: var(--primary-color);
        margin: 25px 0 15px 0;
        padding: 12px 0 12px 20px;
        border-left: 5px solid var(--secondary-color);
        background: linear-gradient(90deg, var(--light-bg) 0%, white 100%);
        page-break-after: avoid;
      }

      h3 {
        font-size: 14pt;
        font-weight: 600;
        color: var(--primary-color);
        margin: 20px 0 12px 0;
        padding: 8px 0;
        border-bottom: 2px solid var(--border-color);
        page-break-after: avoid;
      }

      h4 {
        font-size: 12pt;
        font-weight: 600;
        color: var(--primary-color);
        margin: 18px 0 10px 0;
        page-break-after: avoid;
      }

      h5 {
        font-size: 11pt;
        font-weight: 600;
        color: var(--primary-color);
        margin: 15px 0 8px 0;
        page-break-after: avoid;
      }

      h6 {
        font-size: 10pt;
        font-weight: 600;
        color: var(--text-muted);
        margin: 12px 0 6px 0;
        page-break-after: avoid;
      }

      /* 段落 */
      p {
        margin: 10px 0;
        line-height: 1.7;
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
        padding: 12px 10px;
        text-align: left;
        font-weight: 600;
        border: 1px solid rgba(255,255,255,0.2);
      }

      td {
        padding: 10px;
        border: 1px solid var(--border-color);
        vertical-align: top;
        line-height: 1.5;
      }

      tr:nth-child(even) {
        background-color: rgba(52, 152, 219, 0.05);
      }

      /* コードブロック */
      pre {
        background: var(--code-bg);
        border: 1px solid var(--border-color);
        border-radius: 6px;
        padding: 16px;
        margin: 16px 0;
        font-family: "Source Code Pro", "Monaco", "Menlo", "Courier New", monospace;
        font-size: 9pt;
        line-height: 1.5;
        overflow-x: auto;
        page-break-inside: avoid;
        box-shadow: var(--shadow);
      }

      code {
        font-family: "Source Code Pro", "Monaco", "Menlo", "Courier New", monospace;
        font-size: 9pt;
        background: var(--code-bg);
        padding: 2px 6px;
        border-radius: 3px;
        border: 1px solid rgba(0,0,0,0.08);
      }

      pre code {
        background: none;
        border: none;
        padding: 0;
      }

      /* ブロッククォート */
      blockquote {
        border-left: 4px solid var(--secondary-color);
        background: var(--light-bg);
        padding: 15px 20px;
        margin: 15px 0;
        font-style: italic;
        border-radius: 0 6px 6px 0;
        box-shadow: var(--shadow);
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

      /* 強調 */
      strong, b {
        font-weight: 700;
        color: var(--primary-color);
      }

      em, i {
        font-style: italic;
        color: var(--text-color);
      }

      /* 水平線 */
      hr {
        border: none;
        border-top: 2px solid var(--border-color);
        margin: 30px 0;
      }

      /* ページブレーク制御 */
      h1, h2, h3, h4, h5, h6 {
        page-break-after: avoid;
      }

      pre, table, blockquote {
        page-break-inside: avoid;
      }

      tr {
        page-break-inside: avoid;
      }

      /* 印刷最適化 */
      @media print {
        body {
          font-size: 10pt;
          line-height: 1.6;
        }

        h1 { font-size: 22pt; }
        h2 { font-size: 16pt; }
        h3 { font-size: 14pt; }
        h4 { font-size: 12pt; }

        pre, code {
          font-size: 8pt;
        }

        table {
          font-size: 9pt;
        }
      }
    `,
    launch_options: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-setuid-sandbox',
        '--disable-gpu'
      ]
    }
  };
}

// メイン処理
async function main() {
  console.log('🚀 PDF再生成開始...');
  console.log('📋 使用技術: md-to-pdf (Puppeteer + Marked)');
  console.log('');

  let successCount = 0;
  let errorCount = 0;

  for (const doc of DOCUMENTS) {
    try {
      // ファイル存在確認
      if (!fs.existsSync(doc.input)) {
        console.error(`❌ ファイルが見つかりません: ${doc.input}`);
        errorCount++;
        continue;
      }

      console.log(`📄 処理中: ${doc.title}`);
      console.log(`   入力: ${path.basename(doc.input)}`);
      console.log(`   出力: ${path.basename(doc.output)}`);

      // Markdownファイル読み込み
      const markdownContent = fs.readFileSync(doc.input, 'utf8');
      console.log(`   📖 Markdown読み込み完了 (${markdownContent.length.toLocaleString()}文字)`);

      // PDF生成
      const options = getPdfOptions(doc);
      await mdToPdf({ content: markdownContent }, options);

      // ファイルサイズ確認
      const stats = fs.statSync(doc.output);
      const sizeKB = Math.round(stats.size / 1024);
      console.log(`   ✅ PDF生成完了 (${sizeKB.toLocaleString()} KB)`);
      console.log('');

      successCount++;

    } catch (error) {
      console.error(`❌ エラー発生 (${doc.title}):`, error.message);
      console.error('');
      errorCount++;
    }
  }

  // 完了報告
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 PDF再生成処理完了!');
  console.log(`   成功: ${successCount} / ${DOCUMENTS.length}`);
  if (errorCount > 0) {
    console.log(`   失敗: ${errorCount} / ${DOCUMENTS.length}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 生成されたファイル一覧
  console.log('');
  console.log('📋 生成されたPDFファイル:');
  DOCUMENTS.forEach(doc => {
    if (fs.existsSync(doc.output)) {
      const stats = fs.statSync(doc.output);
      const sizeKB = Math.round(stats.size / 1024);
      const relativePath = path.relative(process.cwd(), doc.output);
      console.log(`   ✓ ${relativePath} (${sizeKB.toLocaleString()} KB)`);
    }
  });

  if (errorCount > 0) {
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 予期しないエラー:', error);
    process.exit(1);
  });
}

module.exports = { main };
