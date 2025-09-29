/**
 * File Type Detection Utility
 * マジックナンバーを使用した正確なファイル形式判別
 */

import { redactSensitiveContent } from './security';

export interface FileTypeInfo {
  extension: string;
  mimeType: string;
  encoding: 'binary' | 'utf8' | 'base64';
  isSupported: boolean;
}

export interface MagicNumberPattern {
  pattern: number[];
  offset: number;
  fileType: FileTypeInfo;
  minLength?: number;
}

// マジックナンバーパターン定義
const MAGIC_PATTERNS: MagicNumberPattern[] = [
  // Executable formats (treated as unsupported for security)
  {
    pattern: [0x4D, 0x5A], // MZ header for PE executables
    offset: 0,
    fileType: {
      extension: '.bin',
      mimeType: 'application/octet-stream',
      encoding: 'binary',
      isSupported: false
    }
  },
  {
    pattern: [0x7F, 0x45, 0x4C, 0x46], // ELF header
    offset: 0,
    fileType: {
      extension: '.bin',
      mimeType: 'application/octet-stream',
      encoding: 'binary',
      isSupported: false
    }
  },
  {
    pattern: [0xCA, 0xFE, 0xBA, 0xBE], // Java class file
    offset: 0,
    fileType: {
      extension: '.bin',
      mimeType: 'application/octet-stream',
      encoding: 'binary',
      isSupported: false
    }
  },

  // PDF ファイル
  {
    pattern: [0x25, 0x50, 0x44, 0x46], // %PDF
    offset: 0,
    fileType: {
      extension: '.pdf',
      mimeType: 'application/pdf',
      encoding: 'base64',
      isSupported: true
    }
  },
  
  // Microsoft PowerPoint (.pptx) - ZIP-based
  {
    pattern: [0x50, 0x4B, 0x03, 0x04], // PK..
    offset: 0,
    fileType: {
      extension: '.pptx',
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      encoding: 'binary',
      isSupported: true
    }
  },
  
  // Microsoft Excel Binary (.xlsb) - ZIP-based (優先順位：詳細判別が必要なため先に配置)
  {
    pattern: [0x50, 0x4B, 0x03, 0x04], // PK..
    offset: 0,
    fileType: {
      extension: '.xlsb',
      mimeType: 'application/vnd.ms-excel.sheet.binary.macroEnabled.12',
      encoding: 'binary',
      isSupported: true
    }
  },
  
  // Microsoft Excel (.xlsx) - ZIP-based
  {
    pattern: [0x50, 0x4B, 0x03, 0x04], // PK..
    offset: 0,
    fileType: {
      extension: '.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      encoding: 'binary',
      isSupported: true
    }
  },
  
  // Microsoft Word (.docx) - ZIP-based
  {
    pattern: [0x50, 0x4B, 0x03, 0x04], // PK..
    offset: 0,
    fileType: {
      extension: '.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      encoding: 'binary',
      isSupported: true
    }
  },
  
  // Microsoft PowerPoint 97-2003 (.ppt) - OLE2
  {
    pattern: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], // OLE2 header
    offset: 0,
    fileType: {
      extension: '.ppt',
      mimeType: 'application/vnd.ms-powerpoint',
      encoding: 'binary',
      isSupported: true
    }
  },
  
  // Microsoft Excel 97-2003 (.xls) - OLE2
  {
    pattern: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], // OLE2 header
    offset: 0,
    fileType: {
      extension: '.xls',
      mimeType: 'application/vnd.ms-excel',
      encoding: 'binary',
      isSupported: true
    }
  },
  
  // Microsoft Word 97-2003 (.doc) - OLE2
  {
    pattern: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], // OLE2 header
    offset: 0,
    fileType: {
      extension: '.doc',
      mimeType: 'application/msword',
      encoding: 'binary',
      isSupported: true
    }
  },
  
  // Microsoft Excel Macro (.xlm) - OLE2
  {
    pattern: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], // OLE2 header
    offset: 0,
    fileType: {
      extension: '.xlm',
      mimeType: 'application/vnd.ms-excel',
      encoding: 'binary',
      isSupported: true
    }
  },
  
  // Apple iWork Pages
  {
    pattern: [0x50, 0x4B, 0x03, 0x04], // ZIP-based
    offset: 0,
    fileType: {
      extension: '.pages',
      mimeType: 'application/x-iwork-pages-sffpages',
      encoding: 'binary',
      isSupported: true
    }
  },
  
  // Apple iWork Numbers
  {
    pattern: [0x50, 0x4B, 0x03, 0x04], // ZIP-based
    offset: 0,
    fileType: {
      extension: '.numbers',
      mimeType: 'application/x-iwork-numbers-sffnumbers',
      encoding: 'binary',
      isSupported: true
    }
  },
  
  // Apple iWork Keynote
  {
    pattern: [0x50, 0x4B, 0x03, 0x04], // ZIP-based
    offset: 0,
    fileType: {
      extension: '.key',
      mimeType: 'application/x-iwork-keynote-sffkey',
      encoding: 'binary',
      isSupported: true
    }
  },
  
  // LibreOffice/OpenOffice Writer
  {
    pattern: [0x50, 0x4B, 0x03, 0x04], // ZIP-based
    offset: 0,
    fileType: {
      extension: '.odt',
      mimeType: 'application/vnd.oasis.opendocument.text',
      encoding: 'binary',
      isSupported: true
    }
  },
  
  // LibreOffice/OpenOffice Calc
  {
    pattern: [0x50, 0x4B, 0x03, 0x04], // ZIP-based
    offset: 0,
    fileType: {
      extension: '.ods',
      mimeType: 'application/vnd.oasis.opendocument.spreadsheet',
      encoding: 'binary',
      isSupported: true
    }
  },
  
  // LibreOffice/OpenOffice Impress
  {
    pattern: [0x50, 0x4B, 0x03, 0x04], // ZIP-based
    offset: 0,
    fileType: {
      extension: '.odp',
      mimeType: 'application/vnd.oasis.opendocument.presentation',
      encoding: 'binary',
      isSupported: true
    }
  },
  
  // 7-Zip アーカイブ
  {
    pattern: [0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C], // 7z signature
    offset: 0,
    fileType: {
      extension: '.7z',
      mimeType: 'application/x-7z-compressed',
      encoding: 'binary',
      isSupported: true
    }
  },
  
  // RAR アーカイブ
  {
    pattern: [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x00], // Rar!
    offset: 0,
    fileType: {
      extension: '.rar',
      mimeType: 'application/x-rar-compressed',
      encoding: 'binary',
      isSupported: true
    }
  },
  
  // RAR v5 アーカイブ
  {
    pattern: [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x01, 0x00], // Rar!... (v5)
    offset: 0,
    fileType: {
      extension: '.rar',
      mimeType: 'application/x-rar-compressed',
      encoding: 'binary',
      isSupported: true
    }
  },
  
  // GZIP アーカイブ
  {
    pattern: [0x1F, 0x8B], // GZ signature
    offset: 0,
    fileType: {
      extension: '.gz',
      mimeType: 'application/gzip',
      encoding: 'binary',
      isSupported: true
    }
  },
  
  // XZ アーカイブ
  {
    pattern: [0xFD, 0x37, 0x7A, 0x58, 0x5A, 0x00], // XZ signature
    offset: 0,
    fileType: {
      extension: '.xz',
      mimeType: 'application/x-xz',
      encoding: 'binary',
      isSupported: true
    }
  },
  
  // TAR アーカイブ (ustar magic)
  {
    pattern: [0x75, 0x73, 0x74, 0x61, 0x72], // ustar
    offset: 257,
    fileType: {
      extension: '.tar',
      mimeType: 'application/x-tar',
      encoding: 'binary',
      isSupported: true
    }
  },
  
  // LZH アーカイブ
  {
    pattern: [0x2D, 0x6C, 0x68], // -lh
    offset: 2,
    fileType: {
      extension: '.lzh',
      mimeType: 'application/x-lzh-compressed',
      encoding: 'binary',
      isSupported: true
    }
  },
  
  // PNG 画像
  {
    pattern: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], // PNG signature
    offset: 0,
    minLength: 4,
    fileType: {
      extension: '.png',
      mimeType: 'image/png',
      encoding: 'binary',
      isSupported: true
    }
  },
  
  // JPEG 画像
  {
    pattern: [0xFF, 0xD8, 0xFF], // JPEG SOI
    offset: 0,
    fileType: {
      extension: '.jpg',
      mimeType: 'image/jpeg',
      encoding: 'binary',
      isSupported: true
    }
  },
  
  // JPEG 2000 (.j2k/.jp2)
  {
    pattern: [0x00, 0x00, 0x00, 0x0C, 0x6A, 0x50, 0x20, 0x20], // JP2 signature
    offset: 0,
    fileType: {
      extension: '.j2k',
      mimeType: 'image/jp2',
      encoding: 'binary',
      isSupported: true
    }
  },
  
  // MP4 動画
  {
    pattern: [0x66, 0x74, 0x79, 0x70], // ftyp
    offset: 4,
    fileType: {
      extension: '.mp4',
      mimeType: 'video/mp4',
      encoding: 'binary',
      isSupported: true
    }
  },
  
  // MPEG 動画
  {
    pattern: [0x00, 0x00, 0x01, 0xBA], // MPEG-PS
    offset: 0,
    fileType: {
      extension: '.mpg',
      mimeType: 'video/mpeg',
      encoding: 'binary',
      isSupported: true
    }
  },
  
  // MP3 音声 (ID3v2)
  {
    pattern: [0x49, 0x44, 0x33], // ID3
    offset: 0,
    fileType: {
      extension: '.mp3',
      mimeType: 'audio/mpeg',
      encoding: 'binary',
      isSupported: true
    }
  },
  
  // MP3 音声 (MPEG Audio)
  {
    pattern: [0xFF, 0xFB], // MPEG-1 Layer 3
    offset: 0,
    fileType: {
      extension: '.mp3',
      mimeType: 'audio/mpeg',
      encoding: 'binary',
      isSupported: true
    }
  },
  
  // EPUB ebook
  {
    pattern: [0x50, 0x4B, 0x03, 0x04], // ZIP-based
    offset: 0,
    fileType: {
      extension: '.epub',
      mimeType: 'application/epub+zip',
      encoding: 'binary',
      isSupported: true
    }
  },
  
  // SQLite Database
  {
    pattern: [0x53, 0x51, 0x4C, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6F, 0x72, 0x6D, 0x61, 0x74, 0x20, 0x33], // "SQLite format 3"
    offset: 0,
    fileType: {
      extension: '.sqlite',
      mimeType: 'application/x-sqlite3',
      encoding: 'binary',
      isSupported: true
    }
  },
  
  // ZIP アーカイブ
  {
    pattern: [0x50, 0x4B, 0x03, 0x04], // PK..
    offset: 0,
    fileType: {
      extension: '.zip',
      mimeType: 'application/zip',
      encoding: 'binary',
      isSupported: true
    }
  },
  
  // PEM 証明書/秘密鍵
  {
    pattern: [0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x42, 0x45, 0x47, 0x49, 0x4E], // -----BEGIN
    offset: 0,
    fileType: {
      extension: '.pem',
      mimeType: 'application/x-pem-file',
      encoding: 'utf8',
      isSupported: true
    }
  },
  
  // DER エンコード証明書
  {
    pattern: [0x30, 0x82], // ASN.1 SEQUENCE
    offset: 0,
    fileType: {
      extension: '.crt',
      mimeType: 'application/x-x509-ca-cert',
      encoding: 'binary',
      isSupported: true
    }
  },
  
  // P7B/P7C 証明書チェーン
  {
    pattern: [0x30, 0x80], // ASN.1 SEQUENCE (indefinite length)
    offset: 0,
    fileType: {
      extension: '.p7b',
      mimeType: 'application/x-pkcs7-certificates',
      encoding: 'binary',
      isSupported: true
    }
  }
];

/**
 * バッファからファイル形式を検出
 */
export function detectFileType(buffer: Buffer): FileTypeInfo {
  // マジックナンバーチェック
  for (const pattern of MAGIC_PATTERNS) {
    if (matchesPattern(buffer, pattern)) {
      // ZIP-baseファイル（Office系）の詳細判別
      if (pattern.fileType.extension === '.xlsx' && isOfficeFile(buffer, 'xlsx')) {
        return pattern.fileType;
      } else if (pattern.fileType.extension === '.xlsb' && isOfficeFile(buffer, 'xlsb')) {
        return pattern.fileType;
      } else if (pattern.fileType.extension === '.docx' && isOfficeFile(buffer, 'docx')) {
        return pattern.fileType;
      } else if (pattern.fileType.extension === '.pptx' && isOfficeFile(buffer, 'pptx')) {
        return pattern.fileType;
      } else if (pattern.fileType.extension === '.pages' && isOfficeFile(buffer, 'pages')) {
        return pattern.fileType;
      } else if (pattern.fileType.extension === '.numbers' && isOfficeFile(buffer, 'numbers')) {
        return pattern.fileType;
      } else if (pattern.fileType.extension === '.key' && isOfficeFile(buffer, 'key')) {
        return pattern.fileType;
      } else if (pattern.fileType.extension === '.odt' && isOfficeFile(buffer, 'odt')) {
        return pattern.fileType;
      } else if (pattern.fileType.extension === '.ods' && isOfficeFile(buffer, 'ods')) {
        return pattern.fileType;
      } else if (pattern.fileType.extension === '.odp' && isOfficeFile(buffer, 'odp')) {
        return pattern.fileType;
      } else if (pattern.fileType.extension === '.epub' && isEpubFile(buffer)) {
        return pattern.fileType;
      }
      // OLE2-baseファイル（レガシーOffice系）の詳細判別
      else if (pattern.fileType.extension === '.xls' && isOLEOfficeFile(buffer, 'xls')) {
        return pattern.fileType;
      } else if (pattern.fileType.extension === '.xlm' && isOLEOfficeFile(buffer, 'xlm')) {
        return pattern.fileType;
      } else if (pattern.fileType.extension === '.doc' && isOLEOfficeFile(buffer, 'doc')) {
        return pattern.fileType;
      } else if (pattern.fileType.extension === '.ppt' && isOLEOfficeFile(buffer, 'ppt')) {
        return pattern.fileType;
      }
      // ZIP/OLE2ベースではない形式（PDF、アーカイブ、メディアファイル等）
      else if (!isZipBasedOfficeFormat(pattern.fileType.extension) && 
               !isOLE2BasedOfficeFormat(pattern.fileType.extension)) {
        return pattern.fileType;
      }
    }
  }

  if (buffer.length < 4) {
    return {
      extension: '.bin',
      mimeType: 'application/octet-stream',
      encoding: 'binary',
      isSupported: false
    };
  }

  // 特殊なテキスト形式の検出
  const textFileType = detectTextFileType(buffer);
  if (textFileType) {
    return textFileType;
  }
  
  // テキストファイル判定（汎用）
  if (isTextFile(buffer)) {
    return {
      extension: '.txt',
      mimeType: 'text/plain',
      encoding: 'utf8',
      isSupported: true
    };
  }
  
  // 不明なファイル形式
  return {
    extension: '.bin',
    mimeType: 'application/octet-stream',
    encoding: 'binary',
    isSupported: false
  };
}

/**
 * ZIP形式ベースのOffice文書かチェック
 */
function isZipBasedOfficeFormat(extension: string): boolean {
  return ['.xlsx', '.xlsb', '.docx', '.pptx', '.pages', '.numbers', '.key', '.odt', '.ods', '.odp', '.epub'].includes(extension);
}

/**
 * OLE2形式ベースのOffice文書かチェック
 */
function isOLE2BasedOfficeFormat(extension: string): boolean {
  return ['.xls', '.xlm', '.doc', '.ppt'].includes(extension);
}

/**
 * EPUBファイルの詳細判別
 */
function isEpubFile(buffer: Buffer): boolean {
  try {
    const content = buffer.toString('binary', 0, Math.min(512, buffer.length));
    return content.includes('META-INF/container.xml') || content.includes('mimetype') || content.includes('application/epub+zip');
  } catch (error) {
    return false;
  }
}

/**
 * 特殊なテキスト形式の検出
 */
function detectTextFileType(buffer: Buffer): FileTypeInfo | null {
  const previewLength = Math.min(4096, buffer.length);
  const preview = buffer.toString('utf8', 0, previewLength);
  const trimmedPreview = preview.trimStart();

  // RTF ファイル
  if (trimmedPreview.startsWith('{\\rtf')) {
    return {
      extension: '.rtf',
      mimeType: 'text/rtf',
      encoding: 'utf8',
      isSupported: true
    };
  }

  // JSON ファイル
  if (trimmedPreview.startsWith('{') || trimmedPreview.startsWith('[')) {
    const fullContent = buffer.toString('utf8').trim();

    if (hasMatchingJsonBoundary(fullContent)) {
      try {
        JSON.parse(fullContent);
        return {
          extension: '.json',
          mimeType: 'application/json',
          encoding: 'utf8',
          isSupported: true
        };
      } catch {
        // JSON Parse エラーは無視
      }
    }
  }

  // YAML ファイル
  if (preview.includes('---\n') || preview.match(/^[a-zA-Z_][a-zA-Z0-9_]*:\s/m)) {
    return {
      extension: '.yml',
      mimeType: 'application/x-yaml',
      encoding: 'utf8',
      isSupported: true
    };
  }

  // TSV ファイル（タブ区切り）
  const lines = preview.split('\n').slice(0, 5); // 最初の5行をチェック
  const tabCount = lines.filter(line => line.includes('\t')).length;
  if (tabCount >= 2 && tabCount / lines.length > 0.5) {
    return {
      extension: '.tsv',
      mimeType: 'text/tab-separated-values',
      encoding: 'utf8',
      isSupported: true
    };
  }

  // C言語ソースファイル
  if (preview.includes('#include') && (preview.includes('int main') || preview.includes('void ') || preview.includes('return '))) {
    return {
      extension: '.c',
      mimeType: 'text/x-csrc',
      encoding: 'utf8',
      isSupported: true
    };
  }

  // C++ ソースファイル
  if (preview.includes('#include') && (preview.includes('std::') || preview.includes('namespace') || preview.includes('class '))) {
    return {
      extension: '.cpp',
      mimeType: 'text/x-c++src',
      encoding: 'utf8',
      isSupported: true
    };
  }

  // JavaScript ファイル
  if (preview.includes('function') && (preview.includes('var ') || preview.includes('let ') || preview.includes('const '))) {
    return {
      extension: '.js',
      mimeType: 'text/javascript',
      encoding: 'utf8',
      isSupported: true
    };
  }
  
  // Python ファイル
  if (preview.includes('def ') && (preview.includes('import ') || preview.includes('from ') || preview.includes('if __name__'))) {
    return {
      extension: '.py',
      mimeType: 'text/x-python',
      encoding: 'utf8',
      isSupported: true
    };
  }
  
  // Shell スクリプト
  if (trimmedPreview.startsWith('#!/bin/bash') || trimmedPreview.startsWith('#!/bin/sh') || trimmedPreview.startsWith('#!/usr/bin/env')) {
    return {
      extension: '.sh',
      mimeType: 'text/x-shellscript',
      encoding: 'utf8',
      isSupported: true
    };
  }
  
  // SQL ファイル
  const upperPreview = preview.toUpperCase();
  if (upperPreview.includes('SELECT') || upperPreview.includes('CREATE TABLE') || upperPreview.includes('INSERT INTO')) {
    return {
      extension: '.sql',
      mimeType: 'text/x-sql',
      encoding: 'utf8',
      isSupported: true
    };
  }
  
  // CSV ファイル
  const commaCount = lines.filter(line => line.includes(',')).length;
  if (commaCount >= 2 && commaCount / lines.length > 0.6) {
    return {
      extension: '.csv',
      mimeType: 'text/csv',
      encoding: 'utf8',
      isSupported: true
    };
  }
  
  return null;
}

function hasMatchingJsonBoundary(content: string): boolean {
  if (!content) {
    return false;
  }

  const firstChar = content[0];
  const lastChar = content[content.length - 1];

  if (firstChar === '{') {
    return lastChar === '}';
  }

  if (firstChar === '[') {
    return lastChar === ']';
  }

  return false;
}

function getUtf8SequenceLength(firstByte: number): number {
  if ((firstByte & 0b10000000) === 0) {
    return 1;
  }

  if ((firstByte & 0b11100000) === 0b11000000 && firstByte >= 0xC2 && firstByte <= 0xDF) {
    return 2;
  }

  if ((firstByte & 0b11110000) === 0b11100000 && firstByte <= 0xEF) {
    return 3;
  }

  if ((firstByte & 0b11111000) === 0b11110000 && firstByte <= 0xF4) {
    return 4;
  }

  return 0;
}

/**
 * マジックナンバーパターンマッチング
 */
function matchesPattern(buffer: Buffer, pattern: MagicNumberPattern): boolean {
  const requiredLength = pattern.offset + (pattern.minLength ?? pattern.pattern.length);
  if (buffer.length < requiredLength) {
    return false;
  }

  const availableLength = buffer.length - pattern.offset;
  const compareLength = Math.min(pattern.pattern.length, availableLength);

  for (let i = 0; i < compareLength; i++) {
    if (buffer[pattern.offset + i] !== pattern.pattern[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Office文書の詳細判別（ZIP内のファイル構造確認）
 */
function isOfficeFile(buffer: Buffer, type: 'xlsx' | 'docx' | 'pptx' | 'xlsb' | 'pages' | 'numbers' | 'key' | 'odt' | 'ods' | 'odp'): boolean {
  try {
    // ZIP内のファイル名を簡易チェック
    const content = buffer.toString('binary', 0, Math.min(2048, buffer.length));
    
    switch (type) {
      case 'xlsx':
        // Excel固有のファイル構造を確認
        return content.includes('xl/') || content.includes('worksheets/') || content.includes('xl/workbook.xml');
      
      case 'xlsb':
        // Excel Binary固有のファイル構造を確認
        return content.includes('xl/') && (content.includes('workbook.bin') || content.includes('binaryIndex') || content.includes('.bin'));
      
      case 'docx':
        // Word固有のファイル構造を確認
        return content.includes('word/') || content.includes('document.xml') || content.includes('word/document.xml');
      
      case 'pptx':
        // PowerPoint固有のファイル構造を確認
        return content.includes('ppt/') || content.includes('slides/') || content.includes('ppt/presentation.xml');
      
      case 'pages':
        // Apple Pages固有のファイル構造を確認
        return content.includes('index.xml') && content.includes('preview.jpg');
      
      case 'numbers':
        // Apple Numbers固有のファイル構造を確認
        return content.includes('index.xml') && (content.includes('Tables/') || content.includes('Metadata/'));
      
      case 'key':
        // Apple Keynote固有のファイル構造を確認
        return content.includes('index.xml') && content.includes('Data/');
      
      case 'odt':
        // OpenDocument Text固有のファイル構造を確認
        return content.includes('content.xml') && content.includes('meta.xml') && content.includes('mimetype');
      
      case 'ods':
        // OpenDocument Spreadsheet固有のファイル構造を確認
        return content.includes('content.xml') && content.includes('meta.xml') && content.includes('mimetype');
      
      case 'odp':
        // OpenDocument Presentation固有のファイル構造を確認
        return content.includes('content.xml') && content.includes('meta.xml') && content.includes('mimetype');
      
      default:
        return false;
    }
  } catch (error) {
    // ZIP構造解析エラーの場合は基本判定を使用
  }
  
  return false;
}

/**
 * OLE2文書の詳細判別（OLE内のストリーム構造確認）
 */
function isOLEOfficeFile(buffer: Buffer, type: 'xls' | 'doc' | 'ppt' | 'xlm'): boolean {
  try {
    // OLE2構造の簡易チェック（最初の1KBをバイナリ検索）
    const content = buffer.toString('binary', 0, Math.min(1024, buffer.length));
    
    switch (type) {
      case 'xls':
      case 'xlm':
        // Excel固有のOLE2ストリーム確認
        return content.includes('Workbook') || content.includes('Book') || content.includes('\u0005\u0000');
      
      case 'doc':
        // Word固有のOLE2ストリーム確認
        return content.includes('WordDocument') || content.includes('\u0009\u0008') || content.includes('Microsoft');
      
      case 'ppt':
        // PowerPoint固有のOLE2ストリーム確認
        return content.includes('PowerPoint') || content.includes('\u000F\u0000') || content.includes('Current User');
      
      default:
        return false;
    }
  } catch (error) {
    // OLE2構造解析エラーの場合は基本判定を使用
  }
  
  return false;
}

/**
 * テキストファイル判定
 */
function isTextFile(buffer: Buffer): boolean {
  if (buffer.length === 0) {
    return true;
  }

  const sampleSize = Math.min(4096, buffer.length);
  const sample = buffer.slice(0, sampleSize);

  let textBytes = 0;
  let index = 0;

  while (index < sample.length) {
    const byte = sample[index];

    if ((byte >= 0x20 && byte <= 0x7E) || byte === 0x09 || byte === 0x0A || byte === 0x0D) {
      textBytes++;
      index++;
      continue;
    }

    if (byte === 0x00) {
      return false;
    }

    const sequenceLength = getUtf8SequenceLength(byte);
    if (sequenceLength > 1) {
      if (index + sequenceLength > sample.length) {
        break;
      }

      let isValidSequence = true;
      for (let i = 1; i < sequenceLength; i++) {
        const continuationByte = sample[index + i];
        if ((continuationByte & 0b11000000) !== 0b10000000) {
          isValidSequence = false;
          break;
        }
      }

      if (isValidSequence) {
        textBytes += sequenceLength;
        index += sequenceLength;
        continue;
      }
    }

    index++;
  }

  return (textBytes / sample.length) > 0.8;
}

/**
 * ファイル形式が処理サポート対象かを確認
 */
export function isSupportedFileType(fileType: FileTypeInfo): boolean {
  return fileType.isSupported;
}

/**
 * デバッグ用：バッファの最初の32バイトを16進数で表示
 */
export function debugMagicNumber(buffer: Buffer): string {
  const size = Math.min(32, buffer.length);
  const hex = Array.from(buffer.slice(0, size))
    .map(b => b.toString(16).padStart(2, '0'))
    .join(' ');
  const ascii = Array.from(buffer.slice(0, size))
    .map(b => (b >= 0x20 && b <= 0x7E) ? String.fromCharCode(b) : '.')
    .join('');

  const sanitizedAscii = redactSensitiveContent(ascii);

  return `HEX: ${hex}\nASCII: ${sanitizedAscii}`;
}