// In-memory token store for MVP
// In production, use a database (e.g., Cloud SQL, Firestore)

const tokens = {};

module.exports = {
  getToken: (userId) => {
    return tokens[userId];
  },

  getAllUsers: () => {
    return Object.keys(tokens);
  },
  setToken: (userId, token) => { tokens[userId] = token; },
  // For simplicity in MVP, we might assume a single user or pass a session ID
  // If ElevenLabs doesn't pass user ID, we might just default to the "demo" user
  // provided the user has authenticated via the frontend.
};
