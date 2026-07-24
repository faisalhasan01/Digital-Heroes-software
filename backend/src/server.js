const express = require('express');
const cors = require('cors');
const path = require('path');
const { auditUrl } = require('./parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all requests to ensure frontend can talk to backend regardless of host
app.use(cors());

// Parse JSON body payloads
app.use(express.json());

// Serve static frontend assets from the root directory
app.use(express.static(path.join(__dirname, '../../')));

/**
 * POST /api/audit
 * Audits a given URL and returns the parsed SEO metrics.
 */
app.post('/api/audit', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'URL is required. Please provide a URL in the request body.'
    });
  }

  try {
    const report = await auditUrl(url, 8000);
    return res.json(report);
  } catch (error) {
    console.error(`Audit failed for URL: ${url} - Error: ${error.message}`);
    
    const isClientError = error.message.includes('Invalid URL') || 
                          error.message.includes('not return an HTML document') ||
                          error.message.includes('Host not found');

    return res.status(isClientError ? 400 : 500).json({
      success: false,
      error: error.message || 'An unexpected error occurred while auditing the page.'
    });
  }
});

// Serve frontend SPA index for any unrecognized paths
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` Page Pulse Server is running on port ${PORT}`);
  console.log(` Local URL: http://localhost:${PORT}`);
  console.log(`==================================================`);
});

module.exports = app;
