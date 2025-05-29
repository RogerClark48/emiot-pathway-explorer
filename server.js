const express = require('express');
const cors = require('cors');
const path = require('path');
const { syncDatabase } = require('./models');

// Import routes
const coursesRoutes = require('./routes/courses');
const connectionsRoutes = require('./routes/connections');
const ksbRoutes = require('./routes/ksb');
// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/courses', coursesRoutes);
app.use('/api/connections', connectionsRoutes);
app.use('/api/ksb', ksbRoutes);

// Serve the main HTML file for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Sync database and start the server
syncDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});