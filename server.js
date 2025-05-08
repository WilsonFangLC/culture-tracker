const express = require('express');
const path = require('path');
const port = process.env.PORT || 3000;
const app = express();

// Serve static assets
app.use(express.static(path.join(__dirname, 'ui/dist')));

// Always return the main index.html for any route
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'ui/dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 