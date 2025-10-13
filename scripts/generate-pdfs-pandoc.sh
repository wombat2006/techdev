#!/bin/bash

# PDF生成スクリプト (Pandoc + WeasyPrint)
# API_ENDPOINTS.pdf と GEMINI_MODELS_COMPARISON.pdf を正しいレイアウトで生成

set -e

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# WeasyPrintパス
WEASYPRINT="/home/wombat/.local/bin/weasyprint"

# プロジェクトルート
PROJECT_ROOT="/ai/prj/techdev"
DOCS_DIR="$PROJECT_ROOT/docs"

# CSS スタイル定義
CSS_FILE="/tmp/pdf-styles.css"
cat > "$CSS_FILE" << 'EOF'
/* 高品質PDF CSS - 日本語・英語対応 */
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&family=Noto+Sans:wght@300;400;500;700&family=Source+Code+Pro:wght@400;500;600&display=swap');

:root {
  --primary-color: #2c3e50;
  --secondary-color: #3498db;
  --accent-color: #e74c3c;
  --success-color: #27ae60;
  --light-bg: #f8f9fa;
  --border-color: #dee2e6;
  --text-color: #2c3e50;
  --text-muted: #6c757d;
  --code-bg: #f5f7f9;
  --shadow: 0 2px 4px rgba(0,0,0,0.08);
}

* {
  box-sizing: border-box;
}

@page {
  size: A4;
  margin: 25mm 20mm;

  @top-center {
    content: "TechSapo Documentation";
    font-family: "Noto Sans", sans-serif;
    font-size: 9pt;
    color: #666;
    padding-bottom: 8px;
    border-bottom: 1px solid #e0e0e0;
  }

  @bottom-center {
    content: "Page " counter(page) " of " counter(pages);
    font-family: "Noto Sans", sans-serif;
    font-size: 9pt;
    color: #666;
    padding-top: 8px;
    border-top: 1px solid #e0e0e0;
  }
}

body {
  font-family: "Noto Sans JP", "Noto Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 11pt;
  line-height: 1.7;
  color: var(--text-color);
  background: white;
  word-wrap: break-word;
  hyphens: auto;
}

/* 見出し */
h1 {
  font-size: 24pt;
  font-weight: 700;
  color: var(--primary-color);
  margin: 30px 0 20px 0;
  padding-bottom: 12px;
  border-bottom: 3px solid var(--secondary-color);
  page-break-after: avoid;
  page-break-inside: avoid;
}

h2 {
  font-size: 18pt;
  font-weight: 600;
  color: var(--primary-color);
  margin: 25px 0 15px 0;
  padding: 10px 0 10px 15px;
  border-left: 4px solid var(--secondary-color);
  background: linear-gradient(90deg, var(--light-bg) 0%, transparent 100%);
  page-break-after: avoid;
  page-break-inside: avoid;
}

h3 {
  font-size: 14pt;
  font-weight: 600;
  color: var(--primary-color);
  margin: 20px 0 12px 0;
  padding-bottom: 6px;
  border-bottom: 2px solid var(--border-color);
  page-break-after: avoid;
  page-break-inside: avoid;
}

h4 {
  font-size: 12pt;
  font-weight: 600;
  color: var(--primary-color);
  margin: 18px 0 10px 0;
  page-break-after: avoid;
  page-break-inside: avoid;
}

h5 {
  font-size: 11pt;
  font-weight: 600;
  color: var(--text-color);
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
  text-align: justify;
}

/* リスト */
ul, ol {
  margin: 12px 0;
  padding-left: 30px;
}

li {
  margin: 6px 0;
  line-height: 1.6;
}

ul li {
  list-style-type: disc;
}

/* テーブル */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
  font-size: 10pt;
  background: white;
  box-shadow: var(--shadow);
  page-break-inside: avoid;
}

thead {
  display: table-header-group;
}

th {
  background: linear-gradient(135deg, var(--secondary-color) 0%, var(--primary-color) 100%);
  color: white;
  padding: 10px 8px;
  text-align: left;
  font-weight: 600;
  border: 1px solid rgba(255,255,255,0.2);
}

td {
  padding: 8px;
  border: 1px solid var(--border-color);
  vertical-align: top;
  line-height: 1.5;
}

tbody tr:nth-child(even) {
  background-color: rgba(52, 152, 219, 0.04);
}

/* コードブロック */
pre {
  background: var(--code-bg);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 14px;
  margin: 16px 0;
  font-family: "Source Code Pro", "Monaco", "Courier New", monospace;
  font-size: 9pt;
  line-height: 1.5;
  overflow-x: auto;
  page-break-inside: avoid;
  box-shadow: var(--shadow);
}

code {
  font-family: "Source Code Pro", "Monaco", "Courier New", monospace;
  font-size: 9pt;
  background: var(--code-bg);
  padding: 2px 5px;
  border-radius: 3px;
  border: 1px solid rgba(0,0,0,0.06);
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
  padding: 12px 16px;
  margin: 15px 0;
  font-style: italic;
  border-radius: 0 4px 4px 0;
}

/* リンク */
a {
  color: var(--secondary-color);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

/* 強調 */
strong, b {
  font-weight: 700;
  color: var(--primary-color);
}

em, i {
  font-style: italic;
}

/* 水平線 */
hr {
  border: none;
  border-top: 2px solid var(--border-color);
  margin: 25px 0;
}

/* ページブレーク制御 */
img {
  max-width: 100%;
  height: auto;
  page-break-inside: avoid;
}

figure {
  page-break-inside: avoid;
}

/* 印刷最適化 */
@media print {
  body {
    font-size: 10pt;
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
EOF

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 PDF生成開始 (Pandoc + WeasyPrint)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

SUCCESS_COUNT=0
ERROR_COUNT=0

# PDF生成関数
generate_pdf() {
  local input_file="$1"
  local output_file="$2"
  local title="$3"

  echo -e "${YELLOW}📄 処理中: ${title}${NC}"
  echo "   入力: $(basename "$input_file")"
  echo "   出力: $(basename "$output_file")"

  if [ ! -f "$input_file" ]; then
    echo -e "${RED}   ❌ ファイルが見つかりません: $input_file${NC}"
    ((ERROR_COUNT++))
    echo ""
    return 1
  fi

  # ファイルサイズ表示
  local file_size=$(wc -c < "$input_file")
  local file_chars=$(wc -m < "$input_file")
  echo "   📖 Markdown読み込み ($(numfmt --grouping "$file_chars") 文字)"

  # Pandocでメタデータ付きHTMLに変換してからPDF生成
  if pandoc "$input_file" \
    --from markdown+gfm_auto_identifiers+fenced_code_blocks+backtick_code_blocks+yaml_metadata_block \
    --to html5 \
    --pdf-engine=weasyprint \
    --css="$CSS_FILE" \
    --metadata title="$title" \
    --metadata date="$(date '+%Y年%m月%d日')" \
    --standalone \
    --toc \
    --toc-depth=3 \
    --output "$output_file" \
    2>&1; then

    if [ -f "$output_file" ]; then
      local pdf_size=$(stat -f%z "$output_file" 2>/dev/null || stat -c%s "$output_file" 2>/dev/null)
      local pdf_size_kb=$((pdf_size / 1024))
      echo -e "${GREEN}   ✅ PDF生成完了 ($(numfmt --grouping "$pdf_size_kb") KB)${NC}"
      ((SUCCESS_COUNT++))
    else
      echo -e "${RED}   ❌ PDFファイルが生成されませんでした${NC}"
      ((ERROR_COUNT++))
    fi
  else
    echo -e "${RED}   ❌ PDF生成エラー${NC}"
    ((ERROR_COUNT++))
  fi

  echo ""
}

# PDF生成実行
cd "$PROJECT_ROOT"

generate_pdf \
  "$DOCS_DIR/API_ENDPOINTS.md" \
  "$DOCS_DIR/API_ENDPOINTS.pdf" \
  "TechSapo API エンドポイント一覧"

generate_pdf \
  "$DOCS_DIR/GEMINI_MODELS_COMPARISON.md" \
  "$DOCS_DIR/GEMINI_MODELS_COMPARISON.pdf" \
  "Gemini Models Performance Comparison"

# 完了報告
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 PDF生成処理完了!${NC}"
echo "   成功: $SUCCESS_COUNT / 2"
if [ $ERROR_COUNT -gt 0 ]; then
  echo -e "${RED}   失敗: $ERROR_COUNT / 2${NC}"
fi
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 生成されたファイル一覧
echo "📋 生成されたPDFファイル:"
for pdf_file in "$DOCS_DIR/API_ENDPOINTS.pdf" "$DOCS_DIR/GEMINI_MODELS_COMPARISON.pdf"; do
  if [ -f "$pdf_file" ]; then
    local size=$(stat -f%z "$pdf_file" 2>/dev/null || stat -c%s "$pdf_file" 2>/dev/null)
    local size_kb=$((size / 1024))
    local rel_path=$(realpath --relative-to="$PROJECT_ROOT" "$pdf_file")
    echo -e "${GREEN}   ✓${NC} $rel_path ($(numfmt --grouping "$size_kb") KB)"
  fi
done

# クリーンアップ
rm -f "$CSS_FILE"

# 終了コード
if [ $ERROR_COUNT -gt 0 ]; then
  exit 1
else
  exit 0
fi
