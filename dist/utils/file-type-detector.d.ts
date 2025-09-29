/**
 * File Type Detection Utility
 * マジックナンバーを使用した正確なファイル形式判別
 */
/// <reference types="node" />
/// <reference types="node" />
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
/**
 * バッファからファイル形式を検出
 */
export declare function detectFileType(buffer: Buffer): FileTypeInfo;
/**
 * ファイル形式が処理サポート対象かを確認
 */
export declare function isSupportedFileType(fileType: FileTypeInfo): boolean;
/**
 * デバッグ用：バッファの最初の32バイトを16進数で表示
 */
export declare function debugMagicNumber(buffer: Buffer): string;
