#!/usr/bin/env python3
"""
Markdown to PDF converter using markdown and weasyprint
"""

import sys
import markdown
from weasyprint import HTML, CSS
from pathlib import Path

def markdown_to_pdf(md_file: str, pdf_file: str):
    """Convert Markdown file to PDF"""

    # Read markdown file
    with open(md_file, 'r', encoding='utf-8') as f:
        md_content = f.read()

    # Convert markdown to HTML
    html_content = markdown.markdown(
        md_content,
        extensions=[
            'extra',
            'codehilite',
            'tables',
            'toc',
            'fenced_code'
        ]
    )

    # Add CSS styling
    css_styles = """
        @page {
            size: A4;
            margin: 2cm;
            @top-right {
                content: "TechSapo API Documentation";
                font-size: 10px;
                color: #666;
            }
            @bottom-center {
                content: "Page " counter(page) " of " counter(pages);
                font-size: 10px;
                color: #666;
            }
        }

        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #333;
        }

        h1 {
            color: #2c3e50;
            font-size: 24pt;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
            margin-top: 30px;
            page-break-before: always;
        }

        h1:first-child {
            page-break-before: avoid;
        }

        h2 {
            color: #34495e;
            font-size: 18pt;
            border-bottom: 2px solid #95a5a6;
            padding-bottom: 8px;
            margin-top: 25px;
        }

        h3 {
            color: #2c3e50;
            font-size: 14pt;
            margin-top: 20px;
        }

        h4 {
            color: #555;
            font-size: 12pt;
            margin-top: 15px;
        }

        code {
            background-color: #f8f8f8;
            border: 1px solid #ddd;
            border-radius: 3px;
            padding: 2px 6px;
            font-family: 'Courier New', monospace;
            font-size: 9pt;
            color: #c7254e;
        }

        pre {
            background-color: #f8f8f8;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 12px;
            overflow-x: auto;
            font-size: 9pt;
            line-height: 1.4;
            page-break-inside: avoid;
        }

        pre code {
            background: none;
            border: none;
            padding: 0;
            color: #333;
        }

        table {
            border-collapse: collapse;
            width: 100%;
            margin: 15px 0;
            font-size: 10pt;
            page-break-inside: avoid;
        }

        th, td {
            border: 1px solid #ddd;
            padding: 8px 12px;
            text-align: left;
        }

        th {
            background-color: #3498db;
            color: white;
            font-weight: bold;
        }

        tr:nth-child(even) {
            background-color: #f9f9f9;
        }

        blockquote {
            border-left: 4px solid #3498db;
            padding-left: 15px;
            margin-left: 0;
            color: #555;
            font-style: italic;
        }

        a {
            color: #3498db;
            text-decoration: none;
        }

        a:hover {
            text-decoration: underline;
        }

        hr {
            border: none;
            border-top: 2px solid #ecf0f1;
            margin: 30px 0;
        }

        ul, ol {
            margin-left: 20px;
            line-height: 1.8;
        }

        li {
            margin-bottom: 5px;
        }

        .toc {
            background-color: #ecf0f1;
            border: 1px solid #bdc3c7;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
        }

        .toc h1 {
            margin-top: 0;
            border-bottom: none;
        }
    """

    # Wrap HTML with proper structure
    full_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>TechSapo API Documentation</title>
    </head>
    <body>
        {html_content}
    </body>
    </html>
    """

    # Convert HTML to PDF
    html = HTML(string=full_html)
    css = CSS(string=css_styles)

    print(f"Converting {md_file} to PDF...")
    html.write_pdf(pdf_file, stylesheets=[css])
    print(f"✅ PDF created successfully: {pdf_file}")

    # Get file size
    pdf_size = Path(pdf_file).stat().st_size
    print(f"   File size: {pdf_size / 1024 / 1024:.2f} MB")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 md-to-pdf.py <input.md> [output.pdf]")
        sys.exit(1)

    input_file = sys.argv[1]

    if len(sys.argv) >= 3:
        output_file = sys.argv[2]
    else:
        # Generate output filename
        output_file = str(Path(input_file).with_suffix('.pdf'))

    markdown_to_pdf(input_file, output_file)
