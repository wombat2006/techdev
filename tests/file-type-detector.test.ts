/**
 * 🧪 File Type Detector 包括的テストスイート
 * マジックナンバーベースファイル検出システムの検証
 */

import { detectFileType, isSupportedFileType, debugMagicNumber, FileTypeInfo } from '../src/utils/file-type-detector';

describe('File Type Detector', () => {
  /**
   * 🔍 PDFファイル検出テスト
   */
  describe('PDF Detection', () => {
    test('should detect PDF from magic number', () => {
      // %PDF-1.4 signature
      const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34]);
      const result = detectFileType(pdfBuffer);
      
      expect(result.extension).toBe('.pdf');
      expect(result.mimeType).toBe('application/pdf');
      expect(result.encoding).toBe('base64');
      expect(result.isSupported).toBe(true);
    });
  });

  /**
   * 📄 Microsoft Office (Modern) 検出テスト
   */
  describe('Microsoft Office (ZIP-based) Detection', () => {
    const zipHeader = Buffer.from([0x50, 0x4B, 0x03, 0x04]); // PK header
    
    test('should detect XLSX from ZIP structure', () => {
      // Excel specific content simulation
      const xlsxContent = Buffer.concat([
        zipHeader,
        Buffer.from('xl/workbook.xmlPK', 'binary')
      ]);
      const result = detectFileType(xlsxContent);
      
      expect(result.extension).toBe('.xlsx');
      expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(result.isSupported).toBe(true);
    });
    
    test('should detect DOCX from ZIP structure', () => {
      // Word specific content simulation
      const docxContent = Buffer.concat([
        zipHeader,
        Buffer.from('word/document.xmlPK', 'binary')
      ]);
      const result = detectFileType(docxContent);
      
      expect(result.extension).toBe('.docx');
      expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(result.isSupported).toBe(true);
    });
    
    test('should detect PPTX from ZIP structure', () => {
      // PowerPoint specific content simulation
      const pptxContent = Buffer.concat([
        zipHeader,
        Buffer.from('ppt/presentation.xmlPK', 'binary')
      ]);
      const result = detectFileType(pptxContent);
      
      expect(result.extension).toBe('.pptx');
      expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.presentationml.presentation');
      expect(result.isSupported).toBe(true);
    });
    
    test('should detect XLSB from ZIP structure', () => {
      // Excel Binary specific content simulation with distinctive content
      const xlsbContent = Buffer.concat([
        zipHeader,
        Buffer.from('xl/workbook.bin', 'binary'),
        Buffer.alloc(50), // padding
        Buffer.from('binaryIndexPK', 'binary')
      ]);
      const result = detectFileType(xlsbContent);
      
      expect(result.extension).toBe('.xlsb');
      expect(result.mimeType).toBe('application/vnd.ms-excel.sheet.binary.macroEnabled.12');
      expect(result.isSupported).toBe(true);
    });
  });

  /**
   * 📄 Microsoft Office (Legacy OLE2) 検出テスト
   */
  describe('Microsoft Office (OLE2-based) Detection', () => {
    const ole2Header = Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]);
    
    test('should detect XLS from OLE2 structure', () => {
      const xlsContent = Buffer.concat([
        ole2Header,
        Buffer.from('Workbook', 'binary')
      ]);
      const result = detectFileType(xlsContent);
      
      expect(result.extension).toBe('.xls');
      expect(result.mimeType).toBe('application/vnd.ms-excel');
      expect(result.isSupported).toBe(true);
    });
    
    test('should detect DOC from OLE2 structure', () => {
      const docContent = Buffer.concat([
        ole2Header,
        Buffer.from('WordDocument', 'binary')
      ]);
      const result = detectFileType(docContent);
      
      expect(result.extension).toBe('.doc');
      expect(result.mimeType).toBe('application/msword');
      expect(result.isSupported).toBe(true);
    });
    
    test('should detect PPT from OLE2 structure', () => {
      const pptContent = Buffer.concat([
        ole2Header,
        Buffer.from('PowerPoint Document', 'binary')
      ]);
      const result = detectFileType(pptContent);
      
      expect(result.extension).toBe('.ppt');
      expect(result.mimeType).toBe('application/vnd.ms-powerpoint');
      expect(result.isSupported).toBe(true);
    });
  });

  /**
   * 🗂️ アーカイブファイル検出テスト
   */
  describe('Archive File Detection', () => {
    test('should detect 7Z archive', () => {
      const sevenZBuffer = Buffer.from([0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C]);
      const result = detectFileType(sevenZBuffer);
      
      expect(result.extension).toBe('.7z');
      expect(result.mimeType).toBe('application/x-7z-compressed');
      expect(result.isSupported).toBe(true);
    });
    
    test('should detect RAR archive', () => {
      const rarBuffer = Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x00]);
      const result = detectFileType(rarBuffer);
      
      expect(result.extension).toBe('.rar');
      expect(result.mimeType).toBe('application/x-rar-compressed');
      expect(result.isSupported).toBe(true);
    });
    
    test('should detect GZIP archive', () => {
      const gzBuffer = Buffer.from([0x1F, 0x8B, 0x08, 0x00]);
      const result = detectFileType(gzBuffer);
      
      expect(result.extension).toBe('.gz');
      expect(result.mimeType).toBe('application/gzip');
      expect(result.isSupported).toBe(true);
    });
    
    test('should detect XZ archive', () => {
      const xzBuffer = Buffer.from([0xFD, 0x37, 0x7A, 0x58, 0x5A, 0x00]);
      const result = detectFileType(xzBuffer);
      
      expect(result.extension).toBe('.xz');
      expect(result.mimeType).toBe('application/x-xz');
      expect(result.isSupported).toBe(true);
    });
    
    test('should detect TAR archive', () => {
      // TAR has ustar at offset 257
      const tarBuffer = Buffer.alloc(300);
      const ustartSignature = Buffer.from([0x75, 0x73, 0x74, 0x61, 0x72]); // "ustar"
      ustartSignature.copy(tarBuffer, 257);
      
      const result = detectFileType(tarBuffer);
      
      expect(result.extension).toBe('.tar');
      expect(result.mimeType).toBe('application/x-tar');
      expect(result.isSupported).toBe(true);
    });
  });

  /**
   * 🖼️ 画像ファイル検出テスト
   */
  describe('Image File Detection', () => {
    test('should detect PNG image', () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      const result = detectFileType(pngBuffer);
      
      expect(result.extension).toBe('.png');
      expect(result.mimeType).toBe('image/png');
      expect(result.isSupported).toBe(true);
    });
    
    test('should detect JPEG image', () => {
      const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
      const result = detectFileType(jpegBuffer);
      
      expect(result.extension).toBe('.jpg');
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.isSupported).toBe(true);
    });
    
    test('should detect JPEG 2000 image', () => {
      const j2kBuffer = Buffer.from([0x00, 0x00, 0x00, 0x0C, 0x6A, 0x50, 0x20, 0x20]);
      const result = detectFileType(j2kBuffer);
      
      expect(result.extension).toBe('.j2k');
      expect(result.mimeType).toBe('image/jp2');
      expect(result.isSupported).toBe(true);
    });
  });

  /**
   * 🎬 メディアファイル検出テスト
   */
  describe('Media File Detection', () => {
    test('should detect MP4 video', () => {
      const mp4Buffer = Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]); // ftyp
      const result = detectFileType(mp4Buffer);
      
      expect(result.extension).toBe('.mp4');
      expect(result.mimeType).toBe('video/mp4');
      expect(result.isSupported).toBe(true);
    });
    
    test('should detect MPEG video', () => {
      const mpegBuffer = Buffer.from([0x00, 0x00, 0x01, 0xBA]);
      const result = detectFileType(mpegBuffer);
      
      expect(result.extension).toBe('.mpg');
      expect(result.mimeType).toBe('video/mpeg');
      expect(result.isSupported).toBe(true);
    });
    
    test('should detect MP3 audio (ID3v2)', () => {
      const mp3Buffer = Buffer.from([0x49, 0x44, 0x33, 0x03, 0x00]); // ID3
      const result = detectFileType(mp3Buffer);
      
      expect(result.extension).toBe('.mp3');
      expect(result.mimeType).toBe('audio/mpeg');
      expect(result.isSupported).toBe(true);
    });
    
    test('should detect MP3 audio (MPEG frame)', () => {
      const mp3Buffer = Buffer.from([0xFF, 0xFB, 0x90, 0x00]);
      const result = detectFileType(mp3Buffer);
      
      expect(result.extension).toBe('.mp3');
      expect(result.mimeType).toBe('audio/mpeg');
      expect(result.isSupported).toBe(true);
    });
  });

  /**
   * 📝 テキストファイル検出テスト
   */
  describe('Text File Detection', () => {
    test('should detect JSON file', () => {
      const jsonBuffer = Buffer.from('{"name": "test", "value": 123}', 'utf8');
      const result = detectFileType(jsonBuffer);
      
      expect(result.extension).toBe('.json');
      expect(result.mimeType).toBe('application/json');
      expect(result.encoding).toBe('utf8');
      expect(result.isSupported).toBe(true);
    });
    
    test('should detect YAML file', () => {
      const yamlBuffer = Buffer.from('---\nname: test\nvalue: 123\n', 'utf8');
      const result = detectFileType(yamlBuffer);
      
      expect(result.extension).toBe('.yml');
      expect(result.mimeType).toBe('application/x-yaml');
      expect(result.encoding).toBe('utf8');
      expect(result.isSupported).toBe(true);
    });
    
    test('should detect TSV file', () => {
      const tsvBuffer = Buffer.from('Name\tAge\tCity\nJohn\t30\tTokyo\nJane\t25\tOsaka\n', 'utf8');
      const result = detectFileType(tsvBuffer);
      
      expect(result.extension).toBe('.tsv');
      expect(result.mimeType).toBe('text/tab-separated-values');
      expect(result.encoding).toBe('utf8');
      expect(result.isSupported).toBe(true);
    });
    
    test('should detect plain text file', () => {
      const textBuffer = Buffer.from('This is a plain text file with some content.', 'utf8');
      const result = detectFileType(textBuffer);
      
      expect(result.extension).toBe('.txt');
      expect(result.mimeType).toBe('text/plain');
      expect(result.encoding).toBe('utf8');
      expect(result.isSupported).toBe(true);
    });
  });

  /**
   * ❌ エッジケーステスト
   */
  describe('Edge Cases', () => {
    test('should handle empty buffer', () => {
      const emptyBuffer = Buffer.alloc(0);
      const result = detectFileType(emptyBuffer);
      
      expect(result.extension).toBe('.bin');
      expect(result.mimeType).toBe('application/octet-stream');
      expect(result.isSupported).toBe(false);
    });
    
    test('should handle very small buffer', () => {
      const smallBuffer = Buffer.from([0x01, 0x02]);
      const result = detectFileType(smallBuffer);
      
      expect(result.extension).toBe('.bin');
      expect(result.mimeType).toBe('application/octet-stream');
      expect(result.isSupported).toBe(false);
    });
    
    test('should handle binary data that looks like text', () => {
      // Binary data with some ASCII characters
      const mixedBuffer = Buffer.from([
        0x00, 0x01, 0x02, 0x48, 0x65, 0x6C, 0x6C, 0x6F, // Hello
        0xFF, 0xFE, 0x00, 0x57, 0x6F, 0x72, 0x6C, 0x64  // World
      ]);
      const result = detectFileType(mixedBuffer);
      
      // Should not be detected as text due to binary data
      expect(result.extension).toBe('.bin');
      expect(result.isSupported).toBe(false);
    });
    
    test('should handle ZIP file without Office indicators', () => {
      const plainZipBuffer = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x00, 0x00, 0x00]);
      const result = detectFileType(plainZipBuffer);
      
      expect(result.extension).toBe('.zip');
      expect(result.mimeType).toBe('application/zip');
      expect(result.isSupported).toBe(true);
    });
  });

  /**
   * 🛠️ ユーティリティ関数テスト
   */
  describe('Utility Functions', () => {
    test('isSupportedFileType should return correct support status', () => {
      const supportedType: FileTypeInfo = {
        extension: '.pdf',
        mimeType: 'application/pdf',
        encoding: 'base64',
        isSupported: true
      };
      
      const unsupportedType: FileTypeInfo = {
        extension: '.bin',
        mimeType: 'application/octet-stream',
        encoding: 'binary',
        isSupported: false
      };
      
      expect(isSupportedFileType(supportedType)).toBe(true);
      expect(isSupportedFileType(unsupportedType)).toBe(false);
    });
    
    test('debugMagicNumber should format hex and ASCII correctly', () => {
      const testBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34]); // %PDF-1.4
      const result = debugMagicNumber(testBuffer);
      
      expect(result).toContain('25 50 44 46 2d 31 2e 34');
      expect(result).toContain('%PDF-1.4');
    });
  });

  /**
   * 🔒 セキュリティテスト
   */
  describe('Security Tests', () => {
    test('should detect disguised executable as PDF', () => {
      // Windows executable header (MZ) disguised with PDF extension
      const fakeExeBuffer = Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00]); // MZ header
      const result = detectFileType(fakeExeBuffer);

      // Should not be detected as PDF
      expect(result.extension).not.toBe('.pdf');
      expect(result.mimeType).not.toBe('application/pdf');
      expect(result.extension).toBe('.bin');
    });

    test('should detect fake Office file', () => {
      // Non-ZIP header claiming to be Office
      const fakeOfficeBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]); // Actually JPEG
      const result = detectFileType(fakeOfficeBuffer);

      expect(result.extension).toBe('.jpg');
      expect(result.mimeType).toBe('image/jpeg');
    });
  });

  describe('Textual Detection Edge Cases', () => {
    test('should detect JSON files larger than the preview window', () => {
      const payload = 'a'.repeat(2048);
      const jsonString = JSON.stringify({ payload });
      const jsonBuffer = Buffer.from(jsonString, 'utf8');

      const result = detectFileType(jsonBuffer);

      expect(result.extension).toBe('.json');
      expect(result.mimeType).toBe('application/json');
      expect(result.encoding).toBe('utf8');
    });

    test('should treat UTF-8 multibyte text as plain text', () => {
      const japaneseText = 'これはテキストファイルです。'.repeat(64);
      const textBuffer = Buffer.from(japaneseText, 'utf8');

      const result = detectFileType(textBuffer);

      expect(result.extension).toBe('.txt');
      expect(result.mimeType).toBe('text/plain');
      expect(result.encoding).toBe('utf8');
    });
  });

  /**
   * 🎯 パフォーマンステスト
   */
  describe('Performance Tests', () => {
    test('should handle large buffer efficiently', () => {
      const largeBuffer = Buffer.alloc(1024 * 1024); // 1MB
      // Set PDF signature at the beginning
      largeBuffer[0] = 0x25; // %
      largeBuffer[1] = 0x50; // P
      largeBuffer[2] = 0x44; // D
      largeBuffer[3] = 0x46; // F
      
      const startTime = process.hrtime();
      const result = detectFileType(largeBuffer);
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;
      
      expect(result.extension).toBe('.pdf');
      expect(milliseconds).toBeLessThan(100); // Should complete within 100ms
    });
  });
});