/**
 * Punycode Replacement Utility
 * WHATWG URL APIを使用したpunycodeモジュール代替実装
 *
 * Node.js punycodeモジュール廃止対応
 * - Node.js v21.0.0: Runtime deprecation
 * - Node.js v16.6.0: Pending deprecation
 * - Node.js v7.0.0: Documentation-only deprecation
 *
 * WHATWG URL Standard準拠の代替実装を提供
 */
export declare class PunycodeReplacement {
    /**
     * ドメイン名をPunycode ASCII形式に変換
     * punycode.toASCII()の代替実装
     */
    static toASCII(domain: string): string;
    /**
     * Punycode ASCII形式をUnicode形式に変換
     * punycode.toUnicode()の代替実装
     */
    static toUnicode(domain: string): string;
    /**
     * Punycode文字列をデコード
     * punycode.decode()の代替実装（限定的）
     */
    static decode(encoded: string): string;
    /**
     * Unicode文字列をPunycodeにエンコード
     * punycode.encode()の代替実装（限定的）
     */
    static encode(unicode: string): string;
    /**
     * UCS2/UCS-2文字列をコードポイント配列に変換
     * punycode.ucs2.decode()の代替実装
     */
    static ucs2decode(string: string): number[];
    /**
     * コードポイント配列をUCS2/UCS-2文字列に変換
     * punycode.ucs2.encode()の代替実装
     */
    static ucs2encode(codePoints: number[]): string;
    /**
     * 現在のPunycodeライブラリバージョン情報
     * 互換性のためのプロパティ
     */
    static get version(): string;
    /**
     * UCS2ユーティリティオブジェクト
     * punycode.ucs2との互換性維持
     */
    static ucs2: {
        decode: typeof PunycodeReplacement.ucs2decode;
        encode: typeof PunycodeReplacement.ucs2encode;
    };
}
/**
 * 廃止警告サプレッサー
 * Node.jsのpunycode deprecation warningを制御
 */
export declare function suppressPunycodeWarnings(): void;
/**
 * レガシーpunycodeモジュールのモック
 * 既存コードとの互換性維持用
 */
export declare const legacyPunycodeCompat: {
    toASCII: typeof PunycodeReplacement.toASCII;
    toUnicode: typeof PunycodeReplacement.toUnicode;
    decode: typeof PunycodeReplacement.decode;
    encode: typeof PunycodeReplacement.encode;
    ucs2: {
        decode: typeof PunycodeReplacement.ucs2decode;
        encode: typeof PunycodeReplacement.ucs2encode;
    };
    version: string;
};
export default PunycodeReplacement;
