const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const port = process.env.PORT || 3000;
const app = express();

// API proxy for backend requests
const apiProxyTarget = process.env.API_URL || 'http://localhost:8000';
app.use('/api', createProxyMiddleware({
  target: apiProxyTarget,
  changeOrigin: true
}));

// Serve static assets
app.use(express.static(path.join(__dirname, 'ui/dist')));

// Always return the main index.html for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'ui/dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`API proxy target: ${apiProxyTarget}`);
}); 