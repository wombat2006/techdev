"use strict";
/**
 * File Type Detection Utility
 * マジックナンバーを使用した正確なファイル形式判別
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectFileType = detectFileType;
exports.isSupportedFileType = isSupportedFileType;
exports.debugMagicNumber = debugMagicNumber;
// マジックナンバーパターン定義
const MAGIC_PATTERNS = [
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
function detectFileType(buffer) {
    // マジックナンバーチェック
    for (const pattern of MAGIC_PATTERNS) {
        if (matchesPattern(buffer, pattern)) {
            // ZIP-baseファイル（Office系）の詳細判別
            if (pattern.fileType.extension === '.xlsx' && isOfficeFile(buffer, 'xlsx')) {
                return pattern.fileType;
            }
            else if (pattern.fileType.extension === '.xlsb' && isOfficeFile(buffer, 'xlsb')) {
                return pattern.fileType;
            }
            else if (pattern.fileType.extension === '.docx' && isOfficeFile(buffer, 'docx')) {
                return pattern.fileType;
            }
            else if (pattern.fileType.extension === '.pptx' && isOfficeFile(buffer, 'pptx')) {
                return pattern.fileType;
            }
            else if (pattern.fileType.extension === '.pages' && isOfficeFile(buffer, 'pages')) {
                return pattern.fileType;
            }
            else if (pattern.fileType.extension === '.numbers' && isOfficeFile(buffer, 'numbers')) {
                return pattern.fileType;
            }
            else if (pattern.fileType.extension === '.key' && isOfficeFile(buffer, 'key')) {
                return pattern.fileType;
            }
            else if (pattern.fileType.extension === '.odt' && isOfficeFile(buffer, 'odt')) {
                return pattern.fileType;
            }
            else if (pattern.fileType.extension === '.ods' && isOfficeFile(buffer, 'ods')) {
                return pattern.fileType;
            }
            else if (pattern.fileType.extension === '.odp' && isOfficeFile(buffer, 'odp')) {
                return pattern.fileType;
            }
            else if (pattern.fileType.extension === '.epub' && isEpubFile(buffer)) {
                return pattern.fileType;
            }
            // OLE2-baseファイル（レガシーOffice系）の詳細判別
            else if (pattern.fileType.extension === '.xls' && isOLEOfficeFile(buffer, 'xls')) {
                return pattern.fileType;
            }
            else if (pattern.fileType.extension === '.xlm' && isOLEOfficeFile(buffer, 'xlm')) {
                return pattern.fileType;
            }
            else if (pattern.fileType.extension === '.doc' && isOLEOfficeFile(buffer, 'doc')) {
                return pattern.fileType;
            }
            else if (pattern.fileType.extension === '.ppt' && isOLEOfficeFile(buffer, 'ppt')) {
                return pattern.fileType;
            }
            // ZIP/OLE2ベースではない形式（PDF、アーカイブ、メディアファイル等）
            else if (!isZipBasedOfficeFormat(pattern.fileType.extension) &&
                !isOLE2BasedOfficeFormat(pattern.fileType.extension)) {
                return pattern.fileType;
            }
        }
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
function isZipBasedOfficeFormat(extension) {
    return ['.xlsx', '.xlsb', '.docx', '.pptx', '.pages', '.numbers', '.key', '.odt', '.ods', '.odp', '.epub'].includes(extension);
}
/**
 * OLE2形式ベースのOffice文書かチェック
 */
function isOLE2BasedOfficeFormat(extension) {
    return ['.xls', '.xlm', '.doc', '.ppt'].includes(extension);
}
/**
 * EPUBファイルの詳細判別
 */
function isEpubFile(buffer) {
    try {
        const content = buffer.toString('binary', 0, Math.min(512, buffer.length));
        return content.includes('META-INF/container.xml') || content.includes('mimetype') || content.includes('application/epub+zip');
    }
    catch (error) {
        return false;
    }
}
/**
 * 特殊なテキスト形式の検出
 */
function detectTextFileType(buffer) {
    const content = buffer.toString('utf8', 0, Math.min(512, buffer.length));
    // RTF ファイル
    if (content.startsWith('{\\rtf')) {
        return {
            extension: '.rtf',
            mimeType: 'text/rtf',
            encoding: 'utf8',
            isSupported: true
        };
    }
    // JSON ファイル
    if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
        try {
            JSON.parse(content.trim());
            return {
                extension: '.json',
                mimeType: 'application/json',
                encoding: 'utf8',
                isSupported: true
            };
        }
        catch {
            // JSON Parse エラーは無視
        }
    }
    // YAML ファイル
    if (content.includes('---\n') || content.match(/^[a-zA-Z_][a-zA-Z0-9_]*:\s/m)) {
        return {
            extension: '.yml',
            mimeType: 'application/x-yaml',
            encoding: 'utf8',
            isSupported: true
        };
    }
    // TSV ファイル（タブ区切り）
    const lines = content.split('\n').slice(0, 5); // 最初の5行をチェック
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
    if (content.includes('#include') && (content.includes('int main') || content.includes('void ') || content.includes('return '))) {
        return {
            extension: '.c',
            mimeType: 'text/x-csrc',
            encoding: 'utf8',
            isSupported: true
        };
    }
    // C++ ソースファイル
    if (content.includes('#include') && (content.includes('std::') || content.includes('namespace') || content.includes('class '))) {
        return {
            extension: '.cpp',
            mimeType: 'text/x-c++src',
            encoding: 'utf8',
            isSupported: true
        };
    }
    // JavaScript ファイル
    if (content.includes('function') && (content.includes('var ') || content.includes('let ') || content.includes('const '))) {
        return {
            extension: '.js',
            mimeType: 'text/javascript',
            encoding: 'utf8',
            isSupported: true
        };
    }
    // Python ファイル
    if (content.includes('def ') && (content.includes('import ') || content.includes('from ') || content.includes('if __name__'))) {
        return {
            extension: '.py',
            mimeType: 'text/x-python',
            encoding: 'utf8',
            isSupported: true
        };
    }
    // Shell スクリプト
    if (content.startsWith('#!/bin/bash') || content.startsWith('#!/bin/sh') || content.startsWith('#!/usr/bin/env')) {
        return {
            extension: '.sh',
            mimeType: 'text/x-shellscript',
            encoding: 'utf8',
            isSupported: true
        };
    }
    // SQL ファイル
    if (content.toUpperCase().includes('SELECT') || content.toUpperCase().includes('CREATE TABLE') || content.toUpperCase().includes('INSERT INTO')) {
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
/**
 * マジックナンバーパターンマッチング
 */
function matchesPattern(buffer, pattern) {
    if (buffer.length < pattern.offset + pattern.pattern.length) {
        return false;
    }
    for (let i = 0; i < pattern.pattern.length; i++) {
        if (buffer[pattern.offset + i] !== pattern.pattern[i]) {
            return false;
        }
    }
    return true;
}
/**
 * Office文書の詳細判別（ZIP内のファイル構造確認）
 */
function isOfficeFile(buffer, type) {
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
    }
    catch (error) {
        // ZIP構造解析エラーの場合は基本判定を使用
    }
    return false;
}
/**
 * OLE2文書の詳細判別（OLE内のストリーム構造確認）
 */
function isOLEOfficeFile(buffer, type) {
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
    }
    catch (error) {
        // OLE2構造解析エラーの場合は基本判定を使用
    }
    return false;
}
/**
 * テキストファイル判定
 */
function isTextFile(buffer) {
    const sampleSize = Math.min(512, buffer.length);
    const sample = buffer.slice(0, sampleSize);
    let textBytes = 0;
    let totalBytes = 0;
    for (const byte of sample) {
        totalBytes++;
        // ASCII範囲 + 一般的な制御文字
        if ((byte >= 0x20 && byte <= 0x7E) || // 印刷可能ASCII
            byte === 0x09 || // タブ
            byte === 0x0A || // LF
            byte === 0x0D || // CR
            byte === 0x20) { // スペース
            textBytes++;
        }
        else if (byte >= 0xC0 && byte <= 0xDF) {
            // UTF-8 2バイト文字の開始
            textBytes++;
        }
        else if (byte >= 0xE0 && byte <= 0xEF) {
            // UTF-8 3バイト文字の開始
            textBytes++;
        }
    }
    // 80%以上がテキスト文字の場合はテキストファイルと判定
    return totalBytes > 0 && (textBytes / totalBytes) > 0.8;
}
/**
 * ファイル形式が処理サポート対象かを確認
 */
function isSupportedFileType(fileType) {
    return fileType.isSupported;
}
/**
 * デバッグ用：バッファの最初の32バイトを16進数で表示
 */
function debugMagicNumber(buffer) {
    const size = Math.min(32, buffer.length);
    const hex = Array.from(buffer.slice(0, size))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ');
    const ascii = Array.from(buffer.slice(0, size))
        .map(b => (b >= 0x20 && b <= 0x7E) ? String.fromCharCode(b) : '.')
        .join('');
    return `HEX: ${hex}\nASCII: ${ascii}`;
}
//# sourceMappingURL=file-type-detector.js.map