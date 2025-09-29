#!/usr/bin/env node

/**
 * PDF生成スクリプト
 * 設計書をMarkdownからPDF形式に変換し、図表を含む包括的なドキュメントを作成
 */

const markdownpdf = require("markdown-pdf");
const fs = require("fs");
const path = require("path");

// PDFオプション設定
const options = {
  paperFormat: "A4",
  paperOrientation: "portrait",
  paperBorder: "2cm",
  remarkable: {
    html: true,
    breaks: true,
    plugins: [],
    syntax: ["footnote", "sup", "sub"]
  },
  cssPath: path.join(__dirname, "pdf-styles.css"),
  preProcessMd: function() {
    const through = require("through2");
    return through(function(chunk, encoding, callback) {
      // Mermaid図をSVGに変換するプリプロセス
      let content = chunk.toString();
      
      // Mermaid図表の処理
      content = content.replace(/```mermaid\n([\s\S]*?)\n```/g, (match, diagram) => {
        // 実際の環境では mermaid-cli を使用してSVG生成
        return `<div class="mermaid-diagram">
          <p><strong>[図表]</strong> ${diagram.split('\n')[0]}</p>
          <pre class="mermaid-code">${diagram}</pre>
        </div>`;
      });

      // コードブロックの強化
      content = content.replace(/```(\w+)\n([\s\S]*?)\n```/g, (match, lang, code) => {
        return `<div class="code-block">
          <div class="code-header">${lang.toUpperCase()}</div>
          <pre><code class="language-${lang}">${code}</code></pre>
        </div>`;
      });

      this.push(content);
      callback();
    });
  }
};

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

// PDFディレクトリ作成
const pdfDir = path.join(__dirname, "..", "docs", "pdf");
if (!fs.existsSync(pdfDir)) {
  fs.mkdirSync(pdfDir, { recursive: true });
}

console.log("🚀 PDF生成開始...");

// 各ドキュメントを順次処理
async function generatePDFs() {
  for (const doc of documents) {
    try {
      console.log(`📄 処理中: ${doc.title}`);
      
      // ファイル存在確認
      if (!fs.existsSync(doc.input)) {
        console.warn(`⚠️  ファイルが見つかりません: ${doc.input}`);
        continue;
      }

      // PDF生成
      await new Promise((resolve, reject) => {
        markdownpdf(options)
          .from(doc.input)
          .to(doc.output, function(err) {
            if (err) {
              reject(err);
            } else {
              console.log(`✅ 生成完了: ${doc.output}`);
              resolve();
            }
          });
      });

    } catch (error) {
      console.error(`❌ エラー発生 (${doc.title}):`, error.message);
    }
  }
}

// PDF統合版作成
async function generateCombinedPDF() {
  console.log("📚 統合PDF生成中...");
  
  const combinedDocs = documents.map(doc => doc.input);
  const combinedOutput = path.join(pdfDir, "TechSapo_設計書_統合版.pdf");
  
  try {
    await new Promise((resolve, reject) => {
      markdownpdf(options)
        .concat.from(combinedDocs)
        .to(combinedOutput, function(err) {
          if (err) {
            reject(err);
          } else {
            console.log(`✅ 統合PDF生成完了: ${combinedOutput}`);
            resolve();
          }
        });
    });
  } catch (error) {
    console.error("❌ 統合PDF生成エラー:", error.message);
  }
}

// メイン実行
async function main() {
  try {
    await generatePDFs();
    await generateCombinedPDF();
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
    console.error("❌ PDF生成失敗:", error);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  main();
}

module.exports = { generatePDFs, generateCombinedPDF };