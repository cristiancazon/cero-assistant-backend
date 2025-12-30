const calendarService = require('../services/calendarService');
const tasksService = require('../services/tasksService');
const tokenStore = require('../utils/tokenStore');

async function getDashboardData(req, res) {
  try {
    const userId = req.query.userId || 'demo-user';
    const authTokens = tokenStore.getToken(userId);

    if (!authTokens) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Calculate start and end of current week (Monday to Sunday)
    // FIX: Ensure we use the real system date, but if we are in a dev environment that might have date mocking,
    // we should trust new Date() unless there's a specific override.
    // However, the issue might be how we calculate Monday.
    
    const today = new Date();
    // If we want to support "mocking" the date for testing, we could check an env var, but for now let's use system time.
    // console.log('[DEBUG] System Date (today):', today.toISOString(), today.toString());

    const day = today.getDay(); // 0 is Sunday, 1 is Monday
    
    // Calculate Monday
    // If today is Sunday (0), we need to subtract 6 days.
    // If today is Monday (1), we subtract 0 days.
    // If today is Tuesday (2), we subtract 1 day.
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(today);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);

    // Calculate Sunday
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const [events, tasks] = await Promise.all([
      calendarService.listEventsJSON(authTokens, {
          timeMin: monday.toISOString(),
          timeMax: sunday.toISOString(),
          maxResults: 250, // Increase limit to fetch all events
          singleEvents: true // Ensure recurring events are expanded
      }),
      tasksService.listTasksJSON(authTokens)
    ]);

    res.json({
      events,
      tasks
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Error al obtener datos del dashboard' });
  }
}

module.exports = {
  getDashboardData,
};
