const { app, connectDB } = require('./app');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

// Initialize database connection and start listening
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Progicart Server running on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to connect to database on startup:', err.message);
  // Still start the server so health checks and informative errors work
  app.listen(PORT, () => {
    console.log(`⚠️ Progicart Server running in limited mode on http://localhost:${PORT} (DB offline)`);
  });
});
