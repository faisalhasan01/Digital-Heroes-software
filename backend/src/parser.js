const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Parses raw HTML string to extract SEO metadata and metrics.
 * 
 * @param {string} html - Raw HTML source.
 * @param {number} responseTimeMs - Request response time in milliseconds.
 * @param {number} statusCode - HTTP status code.
 * @returns {object} Audited metrics.
 */
function parseHtml(html, responseTimeMs, statusCode) {
  if (!html || typeof html !== 'string') {
    return {
      success: true,
      statusCode,
      responseTimeMs,
      title: '',
      metaDescription: '',
      h1Count: 0,
      wordCount: 0,
      images: {
        total: 0,
        missingAlt: 0,
        missingAltSources: []
      }
    };
  }

  const $ = cheerio.load(html);

  // 1. Extract Page Title
  let title = $('title').first().text().trim();

  // 2. Extract Meta Description
  let metaDescription = '';
  const metaDescTag = $('meta[name="description"]').first().attr('content') || 
                       $('meta[name="Description"]').first().attr('content') ||
                       $('meta[property="og:description"]').first().attr('content');
  if (metaDescTag) {
    metaDescription = metaDescTag.trim();
  }

  // 3. Count H1 elements
  const h1Count = $('h1').length;

  // 4. Image ALT verification
  const images = $('img');
  const totalImages = images.length;
  let missingAltCount = 0;
  const missingAltSources = [];

  images.each((_, element) => {
    const alt = $(element).attr('alt');
    const src = $(element).attr('src') || 'Unknown source';
    
    if (alt === undefined || alt === null || alt.trim() === '') {
      missingAltCount++;
      if (missingAltSources.length < 10) {
        missingAltSources.push(src);
      }
    }
  });

  // 5. Approximate word count of body text
  const cleanBody = cheerio.load(html);
  cleanBody('script, style, noscript, svg, iframe, path, head, link, meta, select, option, button').remove();
  
  const bodyText = cleanBody('body').text() || cleanBody.text();
  const cleanText = bodyText
    .replace(/\s+/g, ' ')
    .trim();
  
  const wordCount = cleanText ? cleanText.split(/\s+/).filter(word => word.length > 0).length : 0;

  return {
    success: true,
    statusCode,
    responseTimeMs,
    title,
    metaDescription,
    h1Count,
    wordCount,
    images: {
      total: totalImages,
      missingAlt: missingAltCount,
      missingAltSources
    }
  };
}

/**
 * Audits a given URL by performing an HTTP request and parsing the result.
 * 
 * @param {string} targetUrl - URL to audit.
 * @param {number} timeoutMs - Request timeout in milliseconds.
 * @returns {Promise<object>} JSON report.
 */
async function auditUrl(targetUrl, timeoutMs = 8000) {
  try {
    new URL(targetUrl);
  } catch (err) {
    throw new Error('Invalid URL format. Please provide a complete URL starting with http:// or https://');
  }

  const startTime = Date.now();

  try {
    const response = await axios.get(targetUrl, {
      timeout: timeoutMs,
      headers: {
        'User-Agent': 'PagePulseAuditor/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      validateStatus: () => true
    });

    const responseTimeMs = Date.now() - startTime;
    const contentType = response.headers['content-type'] || '';

    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      throw new Error(`The requested URL did not return an HTML document. (Received content type: ${contentType})`);
    }

    const html = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    return parseHtml(html, responseTimeMs, response.status);

  } catch (error) {
    const responseTimeMs = Date.now() - startTime;

    if (error.code === 'ECONNABORTED') {
      throw new Error(`Request timed out after ${timeoutMs}ms.`);
    }
    if (error.code === 'ENOTFOUND') {
      throw new Error(`Host not found. Please check if the domain exists and you are connected to the internet.`);
    }

    throw new Error(error.message || 'An error occurred while fetching the webpage.');
  }
}

module.exports = {
  parseHtml,
  auditUrl
};
