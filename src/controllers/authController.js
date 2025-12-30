const { google } = require('googleapis');
const tokenStore = require('../utils/tokenStore');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080/api/auth/google/callback'
);

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
];

function login(req, res) {
  try {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent', // Force refresh token
      // FIX: Explicitly pass redirect_uri here to ensure it's included in the request
      redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080/api/auth/google/callback'
    });
    console.log('Redirecting to Google Auth URL:', authUrl);
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).send(`Authentication setup failed: ${error.message}`);
  }
}

async function callback(req, res) {
  console.log('Auth callback received');
  const { code } = req.query;
  console.log('Code received:', code ? 'Yes' : 'No');
  
  try {
    console.log('Exchanging code for tokens...');
    const { tokens } = await oauth2Client.getToken(code);
    console.log('Tokens received');
    oauth2Client.setCredentials(tokens);

    // Get user info to identify the user
    console.log('Fetching user info...');
    const oauth2 = google.oauth2({
        auth: oauth2Client,
        version: 'v2'
    });
    const userInfo = await oauth2.userinfo.get();
    console.log('User info received:', userInfo.data.email);
    const userId = 'demo-user'; // For MVP we map everyone to demo-user or use logic: userInfo.data.id;
    
    // Store tokens
    // In MVP we force 'demo-user' so the webhook can find it easily without complex session passing
    tokenStore.setToken('demo-user', tokens); 
    
    // Also store by real ID if we want to support multiple users later
    if (userInfo.data.id) {
        tokenStore.setToken(userInfo.data.id, tokens);
    }

    // Redirect to frontend
    // Assuming frontend is running on localhost:5173 for dev
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    console.log(`Redirecting to frontend: ${frontendUrl}`);
    res.redirect(`${frontendUrl}?auth=success&userId=demo-user`);

  } catch (error) {
    console.error('Error in auth callback:', error);
    res.status(500).send(`Authentication failed: ${error.message}`);
  }
}

module.exports = {
  login,
  callback,
};
