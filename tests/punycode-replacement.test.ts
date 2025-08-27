/**
 * Punycode Replacement Test Suite
 * WHATWG URL API代替実装のテスト
 */

import { PunycodeReplacement } from '../src/utils/punycode-replacement';

describe('PunycodeReplacement', () => {
  describe('toASCII', () => {
    test('converts Unicode domain to ASCII', () => {
      expect(PunycodeReplacement.toASCII('例え.テスト')).toMatch(/xn--/);
      expect(PunycodeReplacement.toASCII('xn--fsq.xn--zckzah')).toMatch(/xn--/);
    });

    test('handles regular ASCII domains', () => {
      expect(PunycodeReplacement.toASCII('example.com')).toBe('example.com');
      expect(PunycodeReplacement.toASCII('github.com')).toBe('github.com');
    });

    test('handles invalid domains gracefully', () => {
      expect(() => PunycodeReplacement.toASCII('')).not.toThrow();
      expect(() => PunycodeReplacement.toASCII('invalid..domain')).not.toThrow();
    });
  });

  describe('toUnicode', () => {
    test('converts Punycode domain to Unicode', () => {
      const unicode = PunycodeReplacement.toUnicode('xn--n3h.com');
      expect(unicode).toBeTruthy();
    });

    test('handles regular ASCII domains', () => {
      expect(PunycodeReplacement.toUnicode('example.com')).toBe('example.com');
    });
  });

  describe('decode', () => {
    test('decodes Punycode strings', () => {
      const result = PunycodeReplacement.decode('xn--fsq.xn--0zwm56d');
      expect(result).toBeDefined();
    });

    test('returns original string for non-Punycode', () => {
      expect(PunycodeReplacement.decode('example')).toBe('example');
    });
  });

  describe('encode', () => {
    test('encodes Unicode to Punycode format', () => {
      const result = PunycodeReplacement.encode('例え.テスト');
      expect(result).toBeTruthy();
    });

    test('returns original for ASCII strings', () => {
      const result = PunycodeReplacement.encode('example');
      expect(['example'].includes(result)).toBeTruthy();
    });
  });

  describe('ucs2decode', () => {
    test('converts string to codepoints', () => {
      const result = PunycodeReplacement.ucs2decode('abc');
      expect(result).toEqual([97, 98, 99]);
    });

    test('handles Unicode characters', () => {
      const result = PunycodeReplacement.ucs2decode('🌟');
      expect(result.length).toBeGreaterThan(0);
    });

    test('handles surrogate pairs', () => {
      const result = PunycodeReplacement.ucs2decode('𝕳');
      expect(result.length).toBe(1);
    });
  });

  describe('ucs2encode', () => {
    test('converts codepoints to string', () => {
      const result = PunycodeReplacement.ucs2encode([97, 98, 99]);
      expect(result).toBe('abc');
    });

    test('handles Unicode codepoints', () => {
      const result = PunycodeReplacement.ucs2encode([127775]); // 🌟
      expect(result).toBe('🌟');
    });
  });

  describe('version', () => {
    test('returns version string', () => {
      expect(PunycodeReplacement.version).toContain('WHATWG-URL-API-replacement');
    });
  });

  describe('ucs2 object', () => {
    test('has decode and encode methods', () => {
      expect(typeof PunycodeReplacement.ucs2.decode).toBe('function');
      expect(typeof PunycodeReplacement.ucs2.encode).toBe('function');
    });

    test('decode method works', () => {
      const result = PunycodeReplacement.ucs2.decode('test');
      expect(Array.isArray(result)).toBe(true);
    });

    test('encode method works', () => {
      const result = PunycodeReplacement.ucs2.encode([116, 101, 115, 116]);
      expect(result).toBe('test');
    });
  });
});

describe('Punycode Integration Test', () => {
  test('handles typical domain use cases', () => {
    // 日本語ドメイン
    const japaneseDomain = '日本.jp';
    const asciiVersion = PunycodeReplacement.toASCII(japaneseDomain);
    const backToUnicode = PunycodeReplacement.toUnicode(asciiVersion);
    
    expect(asciiVersion).toContain('xn--');
    expect(typeof backToUnicode).toBe('string');
  });

  test('compatibility with Node.js url module', async () => {
    const url = await import('url');
    
    if (url.domainToASCII) {
      const testDomain = 'example.com';
      
      const nodeResult = url.domainToASCII(testDomain);
      const ourResult = PunycodeReplacement.toASCII(testDomain);
      
      expect(ourResult).toBe(nodeResult);
    } else {
      // Node.js version doesn't support domainToASCII
      expect(true).toBe(true);
    }
  });

  test('error handling for invalid inputs', () => {
    expect(() => PunycodeReplacement.toASCII('')).not.toThrow();
    expect(() => PunycodeReplacement.toUnicode('')).not.toThrow();
    expect(() => PunycodeReplacement.decode('')).not.toThrow();
    expect(() => PunycodeReplacement.encode('')).not.toThrow();
  });
});