const { app, connectDB } = require('./app');
const { rerouteExpiredOrders } = require('./utils/riderAssignment');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

const startAutoRerouteMonitor = () => {
  setInterval(() => {
    rerouteExpiredOrders(true).catch((err) => {
      console.warn('Auto-reroute background tick notice:', err.message);
    });
  }, 15000);
};

// Initialize database connection and start listening
connectDB()
  .then(() => {
    startAutoRerouteMonitor();
    app.listen(PORT, () => {
      console.log(`🚀 Progicart Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to database on startup:', err.message);
    app.listen(PORT, () => {
      console.log(`⚠️ Progicart Server running in limited mode on http://localhost:${PORT} (DB offline)`);
    });
  });
