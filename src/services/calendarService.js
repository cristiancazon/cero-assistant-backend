const { google } = require('googleapis');

const getOAuth2Client = (authTokens) => {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: authTokens.access_token,
    refresh_token: authTokens.refresh_token,
    // Add other properties if needed
  });
  return oauth2Client;
};

async function listEvents(authTokens, args) {
  try {
    const auth = getOAuth2Client(authTokens);
    const calendar = google.calendar({ version: 'v3', auth });

    const timeMin = args.timeMin || new Date().toISOString();
    const maxResults = args.maxResults || 10;

    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin,
      maxResults: maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = res.data.items;
    if (!events || events.length === 0) {
      return 'No hay eventos próximos.';
    }

    return events.map((event, i) => {
      const start = event.start.dateTime || event.start.date;
      return `${start} - ${event.summary}`;
    }).join('\n');

  } catch (error) {
    console.error('Error listing calendar events:', error);
    throw new Error('No se pudo acceder al calendario.');
  }
}

async function listEventsJSON(authTokens, args = {}) {
  try {
    const auth = getOAuth2Client(authTokens);
    const calendar = google.calendar({ version: 'v3', auth });

    const params = {
      calendarId: 'primary',
      singleEvents: true,
      orderBy: 'startTime',
    };

    if (args.timeMin) params.timeMin = args.timeMin;
    if (args.timeMax) params.timeMax = args.timeMax;
    if (args.maxResults) params.maxResults = args.maxResults;

    // Default if no range provided: from now, max 20
    if (!params.timeMin && !params.timeMax) {
        params.timeMin = new Date().toISOString();
        params.maxResults = 20;
    }

    const res = await calendar.events.list(params);
    
    console.log(`[DEBUG] Calendar API Response for range ${params.timeMin} - ${params.timeMax}:`, JSON.stringify(res.data.items, null, 2));

    return res.data.items || [];

  } catch (error) {
    console.error('Error listing calendar events JSON:', error);
    return [];
  }
}

async function createEvent(authTokens, args) {
  console.log('[DEBUG] Entering createEvent with args:', JSON.stringify(args, null, 2));
  try {
    const auth = getOAuth2Client(authTokens);
    const calendar = google.calendar({ version: 'v3', auth });

    const event = {
      summary: args.summary,
      start: {
        dateTime: args.startTime,
        timeZone: 'America/Argentina/Buenos_Aires', // Fixed: User requested GMT-3
      },
      end: {
        dateTime: args.endTime,
        timeZone: 'America/Argentina/Buenos_Aires',
      },
    };

    console.log('[DEBUG] Sending to Google API:', JSON.stringify(event, null, 2));

    const res = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    console.log('[DEBUG] Created event response:', res.data.htmlLink);

    return `Evento creado: ${res.data.htmlLink}`;

  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw new Error('No se pudo crear el evento.');
  }
}

module.exports = {
  listEvents,
  listEventsJSON,
  createEvent,
};
