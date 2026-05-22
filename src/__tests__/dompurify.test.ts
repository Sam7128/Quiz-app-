import { describe, it, expect } from 'vitest';
import DOMPurify from 'dompurify';

describe('DOMPurify Sanitization Regression & Snapshot Tests', () => {
  // P0: 確保惡意 XSS 向量被徹底移除或淨化
  describe('XSS Prevention (Security Gates)', () => {
    it('should completely remove script tags', () => {
      const input = '<script>alert("XSS")</script>';
      const sanitized = DOMPurify.sanitize(input);
      expect(sanitized).toBe('');
    });

    it('should strip inline event handlers', () => {
      const input = '<img src="invalid-image.jpg" onerror="alert(1)" onload="console.log(2)" />';
      const sanitized = DOMPurify.sanitize(input);
      expect(sanitized).not.toContain('onerror');
      expect(sanitized).not.toContain('onload');
      expect(sanitized).toContain('src="invalid-image.jpg"');
    });

    it('should sanitize javascript pseudo-protocol links', () => {
      const input = '<a href="javascript:alert(1)">惡意連結</a>';
      const sanitized = DOMPurify.sanitize(input);
      expect(sanitized).not.toContain('javascript:');
      // DOMPurify 預設會過濾 javascript: 協議，保留為 <a> 標籤或安全的 href
      expect(sanitized).toBe('<a>惡意連結</a>');
    });

    it('should sanitize iframe tags', () => {
      const input = '<iframe src="http://evil.com"></iframe>';
      const sanitized = DOMPurify.sanitize(input);
      expect(sanitized).toBe('');
    });

    it('should handle complex nested payloads safely', () => {
      const input = '<div><script>alert(1)</script><p>安全內容<img src="x" onerror="alert(2)"></p></div>';
      const sanitized = DOMPurify.sanitize(input);
      expect(sanitized).toContain('<div>');
      expect(sanitized).toContain('<p>安全內容<img src="x"></p>');
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('onerror');
    });
  });

  // P0: 確保常用的合法 HTML 標籤被正確保留，不影響題目渲染
  describe('Benign HTML Preservation (Utility Gates)', () => {
    it('should preserve text formatting tags', () => {
      const input = '<b>粗體</b> <i>斜體</i> <u>底線</u> <strong>加粗</strong> <em>斜體強調</em>';
      const sanitized = DOMPurify.sanitize(input);
      expect(sanitized).toBe('<b>粗體</b> <i>斜體</i> <u>底線</u> <strong>加粗</strong> <em>斜體強調</em>');
    });

    it('should preserve structural tags', () => {
      const input = '<p>第一段</p><br><span>小段落</span><div>區塊</div>';
      const sanitized = DOMPurify.sanitize(input);
      expect(sanitized).toBe('<p>第一段</p><br><span>小段落</span><div>區塊</div>');
    });

    it('should preserve list elements', () => {
      const input = '<ul><li>列表1</li><li>列表2</li></ul><ol><li>項目1</li></ol>';
      const sanitized = DOMPurify.sanitize(input);
      expect(sanitized).toBe('<ul><li>列表1</li><li>列表2</li></ul><ol><li>項目1</li></ol>');
    });

    it('should preserve safe code structures', () => {
      const input = '<pre><code>const a = 1;\nconsole.log(a);</code></pre>';
      const sanitized = DOMPurify.sanitize(input);
      expect(sanitized).toBe('<pre><code>const a = 1;\nconsole.log(a);</code></pre>');
    });

    it('should preserve safe hyperlinks with absolute or relative URLs (target is stripped by default DOMPurify profile)', () => {
      const input = '<a href="https://example.com" target="_blank" rel="noopener noreferrer">安全連結</a>';
      const sanitized = DOMPurify.sanitize(input);
      expect(sanitized).toContain('href="https://example.com"');
      expect(sanitized).not.toContain('target="_blank"');
      expect(sanitized).toContain('rel="noopener noreferrer"');
    });
  });

  // Snapshot Regression Gate
  describe('HTML Sanitization Snapshots', () => {
    it('should match the regression snapshot for a complex benign document', () => {
      const complexDocument = `
        <div class="quiz-explanation">
          <h2>解答說明 (Explanation)</h2>
          <p>關於本題，我們可以使用以下程式碼來驗證：</p>
          <pre><code>function test() {
            return "Hello, World!";
          }</code></pre>
          <p>以下是一些關鍵步驟：</p>
          <ul>
            <li><strong>步驟 1</strong>: 呼叫 <code>test()</code>。</li>
            <li><strong>步驟 2</strong>: 回傳包含 <em>Hello</em> 欄位的字串。</li>
          </ul>
          <p>更多資訊可以參考 <a href="https://developer.mozilla.org" target="_blank">MDN 網站</a>。</p>
        </div>
      `;
      
      const sanitized = DOMPurify.sanitize(complexDocument);
      expect(sanitized).toMatchSnapshot();
    });
  });
});
