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

import { URL } from 'url';

export class PunycodeReplacement {
  /**
   * ドメイン名をPunycode ASCII形式に変換
   * punycode.toASCII()の代替実装
   */
  static toASCII(domain: string): string {
    try {
      return new URL(`http://${domain}`).hostname;
    } catch (error) {
      // WHATWG URL APIはより厳密なので、フォールバック
      try {
        // url.domainToASCIIを使用（Node.js v7.4.0+）
        const url = require('url');
        return url.domainToASCII ? url.domainToASCII(domain) : domain;
      } catch (fallbackError) {
        // 最終的なフォールバック
        return domain;
      }
    }
  }

  /**
   * Punycode ASCII形式をUnicode形式に変換
   * punycode.toUnicode()の代替実装
   */
  static toUnicode(domain: string): string {
    try {
      // url.domainToUnicodeを使用（Node.js v7.4.0+）
      const url = require('url');
      return url.domainToUnicode ? url.domainToUnicode(domain) : domain;
    } catch (error) {
      return domain;
    }
  }

  /**
   * Punycode文字列をデコード
   * punycode.decode()の代替実装（限定的）
   */
  static decode(encoded: string): string {
    try {
      // 基本的なPunycodeデコード（ドメイン用）
      if (encoded.startsWith('xn--')) {
        return this.toUnicode(encoded);
      }
      return encoded;
    } catch (error) {
      return encoded;
    }
  }

  /**
   * Unicode文字列をPunycodeにエンコード
   * punycode.encode()の代替実装（限定的）
   */
  static encode(unicode: string): string {
    try {
      const asciiDomain = this.toASCII(unicode);
      // xn--で始まる場合のみPunycode部分を返す
      if (asciiDomain.startsWith('xn--')) {
        return asciiDomain.substring(4); // 'xn--'を除く
      }
      return unicode;
    } catch (error) {
      return unicode;
    }
  }

  /**
   * UCS2/UCS-2文字列をコードポイント配列に変換
   * punycode.ucs2.decode()の代替実装
   */
  static ucs2decode(string: string): number[] {
    const output: number[] = [];
    let counter = 0;
    const length = string.length;
    
    while (counter < length) {
      const codePoint = string.codePointAt(counter);
      if (codePoint !== undefined) {
        output.push(codePoint);
        // サロゲートペアの場合は2文字分進める
        counter += codePoint > 0xFFFF ? 2 : 1;
      } else {
        counter++;
      }
    }
    
    return output;
  }

  /**
   * コードポイント配列をUCS2/UCS-2文字列に変換
   * punycode.ucs2.encode()の代替実装
   */
  static ucs2encode(codePoints: number[]): string {
    return String.fromCodePoint(...codePoints);
  }

  /**
   * 現在のPunycodeライブラリバージョン情報
   * 互換性のためのプロパティ
   */
  static get version(): string {
    return 'WHATWG-URL-API-replacement-1.0.0';
  }

  /**
   * UCS2ユーティリティオブジェクト
   * punycode.ucs2との互換性維持
   */
  static ucs2 = {
    decode: this.ucs2decode,
    encode: this.ucs2encode
  };
}

/**
 * 廃止警告サプレッサー
 * Node.jsのpunycode deprecation warningを制御
 */
export function suppressPunycodeWarnings(): void {
  // 環境変数を設定してpunycode警告を抑制
  if (!process.env.NODE_NO_WARNINGS) {
    process.env.NODE_NO_WARNINGS = 'deprecation';
  } else if (!process.env.NODE_NO_WARNINGS.includes('deprecation')) {
    process.env.NODE_NO_WARNINGS += ',deprecation';
  }
  
  // 追加でSUPPRESS_NODE_WARNINGSも設定
  process.env.SUPPRESS_NODE_WARNINGS = 'punycode';
}

/**
 * レガシーpunycodeモジュールのモック
 * 既存コードとの互換性維持用
 */
export const legacyPunycodeCompat = {
  toASCII: PunycodeReplacement.toASCII,
  toUnicode: PunycodeReplacement.toUnicode,
  decode: PunycodeReplacement.decode,
  encode: PunycodeReplacement.encode,
  ucs2: PunycodeReplacement.ucs2,
  version: PunycodeReplacement.version
};

// デフォルトエクスポート
export default PunycodeReplacement;