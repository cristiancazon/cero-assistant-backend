const { http } = require('@google-cloud/functions-framework');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Enable CORS
app.use(cors({ origin: true }));

// Request Logging Middleware (Global)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Parse JSON bodies with higher limit to handle ElevenLabs system prompts
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Import routes
const webhookRoutes = require('./src/routes/webhookRoutes');
const authRoutes = require('./src/routes/authRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const toolsRoutes = require('./src/routes/toolsRoutes');

// Health check route - CRITICAL for Cloud Run
app.get('/', (req, res) => {
  res.status(200).send('Cero Backend is running!');
});

// Register routes
app.use('/api/webhook', webhookRoutes);
// Alias for ElevenLabs simple path
app.use('/responses', webhookRoutes); 

app.use('/api/tools', toolsRoutes); // New Tool Route

// FIX: Also handle POST / (root) if ElevenLabs strips the path, or just in case
app.post('/', (req, res, next) => {
    console.log("Root POST received, forwarding to webhook handler...");
    next();
});

// Mount webhookRoutes at root just for safety if they call https://url/ 
app.use('/', webhookRoutes); 

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Global Error Handler]', err.stack);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// --- CLOUD RUN COMPATIBILITY START ---
const PORT = process.env.PORT || 8080;

// Log para depuración en Cloud Run
console.log(`Intentando iniciar servidor en puerto: ${PORT}`);

// FORCE SERVER START - Always listen, don't rely on conditions
// This ensures Cloud Run health checks pass
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}...`);
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});
// --- CLOUD RUN COMPATIBILITY END ---
