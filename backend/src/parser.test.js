const { parseHtml, auditUrl } = require('./parser');
const axios = require('axios');

// Mock axios for testing auditUrl network paths
jest.mock('axios');

describe('Parser Module Unit Tests', () => {
  
  describe('parseHtml() - HTML Parsing Logic', () => {
    
    test('Happy Path: Parses a complete HTML document with all elements present', () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Test Page Title</title>
            <meta name="description" content="This is a test description for the SEO auditor tool.">
            <meta property="og:description" content="OpenGraph description (should prefer standard description)">
          </head>
          <body>
            <h1>Main Title of the Page</h1>
            <p>Hello world! This is a simple HTML paragraph used to calculate the approximate word count of the website.</p>
            <p>More text content to verify the split calculation.</p>
            <img src="/assets/hero.png" alt="Hero Image">
            <img src="/assets/logo.png"> <!-- Missing alt -->
            <img src="/assets/banner.png" alt=" "> <!-- Space-only alt (considered missing) -->
            <script>console.log("Ignore script content in word count");</script>
            <style>body { color: red; }</style>
          </body>
        </html>
      `;

      const result = parseHtml(mockHtml, 120, 200);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.responseTimeMs).toBe(120);
      expect(result.title).toBe('Test Page Title');
      expect(result.metaDescription).toBe('This is a test description for the SEO auditor tool.');
      expect(result.h1Count).toBe(1);
      
      expect(result.images.total).toBe(3);
      expect(result.images.missingAlt).toBe(2);
      expect(result.images.missingAltSources).toContain('/assets/logo.png');
      expect(result.images.missingAltSources).toContain('/assets/banner.png');
      expect(result.wordCount).toBeGreaterThan(20);
    });

    test('Failure Case 1: Parses HTML missing key elements (title, meta description, h1, images)', () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head>
          </head>
          <body>
            <p>Just some plain text content without SEO elements.</p>
          </body>
        </html>
      `;

      const result = parseHtml(mockHtml, 50, 200);

      expect(result.success).toBe(true);
      expect(result.title).toBe('');
      expect(result.metaDescription).toBe('');
      expect(result.h1Count).toBe(0);
      expect(result.images.total).toBe(0);
      expect(result.images.missingAlt).toBe(0);
      expect(result.images.missingAltSources).toEqual([]);
      expect(result.wordCount).toBe(8);
    });

    test('Failure Case 2: Handles null, empty string, or non-HTML text input gracefully', () => {
      const emptyResult = parseHtml('', 0, 500);
      expect(emptyResult.success).toBe(true);
      expect(emptyResult.title).toBe('');
      expect(emptyResult.metaDescription).toBe('');
      expect(emptyResult.h1Count).toBe(0);
      expect(emptyResult.wordCount).toBe(0);

      const nullResult = parseHtml(null, 10, 500);
      expect(nullResult.success).toBe(true);
      expect(nullResult.wordCount).toBe(0);
    });

    test('Case Insensitive Meta Description: Checks that og:description is used if standard description is missing', () => {
      const mockHtml = `
        <html>
          <head>
            <meta property="og:description" content="Fallback to OpenGraph Description">
          </head>
          <body></body>
        </html>
      `;
      const result = parseHtml(mockHtml, 10, 200);
      expect(result.metaDescription).toBe('Fallback to OpenGraph Description');
    });

  });

  describe('auditUrl() - Network and Fetching Logic', () => {
    
    afterEach(() => {
      jest.clearAllMocks();
    });

    test('Throws error for invalid URL input formats', async () => {
      await expect(auditUrl('invalid-url-format')).rejects.toThrow('Invalid URL format');
      await expect(auditUrl('http://')).rejects.toThrow('Invalid URL format');
    });

    test('Throws error if the page returns non-HTML content-type headers', async () => {
      axios.get.mockResolvedValueOnce({
        status: 200,
        headers: { 'content-type': 'application/json' },
        data: { hello: 'world' }
      });

      await expect(auditUrl('https://example.com/api/data')).rejects.toThrow(
        'did not return an HTML document'
      );
    });

    test('Throws error on connection timeout (Axios abort error)', async () => {
      const timeoutError = new Error('timeout');
      timeoutError.code = 'ECONNABORTED';
      axios.get.mockRejectedValueOnce(timeoutError);

      await expect(auditUrl('https://slow-site.com', 1000)).rejects.toThrow(
        'timed out'
      );
    });

    test('Throws error when domain name resolution fails (DNS host not found)', async () => {
      const dnsError = new Error('getaddrinfo ENOTFOUND');
      dnsError.code = 'ENOTFOUND';
      axios.get.mockRejectedValueOnce(dnsError);

      await expect(auditUrl('https://thisdomaindoesnotexistatall.xyz')).rejects.toThrow(
        'Host not found'
      );
    });

    test('Processes correctly when server returns non-2xx HTML page (e.g. 404 page)', async () => {
      axios.get.mockResolvedValueOnce({
        status: 404,
        headers: { 'content-type': 'text/html; charset=utf-8' },
        data: '<html><head><title>404 Not Found</title></head><body><h1>Not Found</h1><p>Sorry.</p></body></html>'
      });

      const result = await auditUrl('https://example.com/missing-page');
      
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(404);
      expect(result.title).toBe('404 Not Found');
      expect(result.h1Count).toBe(1);
    });

  });

});
