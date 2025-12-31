const googleCalendarService = require('../services/calendarService');
const tokenStore = require('../utils/tokenStore');

async function handleCalendarTool(req, res) {
    console.log("--- TOOL REQUEST RECEIVED ---");
    // Log keys only to avoid spam, but log body if small
    console.log("Body:", JSON.stringify(req.body));

    // Auth Check (Reuse existing permissive logic for demo)
    const userId = req.headers['x-user-id'] || 'demo-user';
    let authTokens = tokenStore.getToken(userId);
    
    // Fallback: use first available user if specific user not found
    if (!authTokens) {
        const allUsers = tokenStore.getAllUsers();
        if (allUsers.length > 0) authTokens = tokenStore.getToken(allUsers[0]);
    }

    if (!authTokens) {
        return res.json({ 
            result: "Error: No has iniciado sesión. Por favor entra a la web para conectar tu calendario." 
        });
    }

    try {
        // ElevenLabs sends parameters flat in the body
        const { action, timeMin, timeMax, summary, startTime, endTime } = req.body;
        let result;

        if (action === 'list_events') {
            // Default to today if no time provided
            const start = timeMin || new Date().toISOString();
            
            // Use listEventsJSON which returns raw objects
            const events = await googleCalendarService.listEventsJSON(authTokens, { 
                timeMin: start, 
                timeMax: timeMax 
            });
            
            if (!events || events.length === 0) {
                result = "No encontré eventos en tu calendario para esas fechas.";
            } else {
                // Format for speech
                result = "Aquí tienes tus eventos:\n" + events.map(e => {
                    const time = e.start.dateTime ? new Date(e.start.dateTime).toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'}) : 'Todo el día';
                    return `- ${e.summary} a las ${time}`;
                }).join("\n");
            }
        } else if (action === 'create_event') {
            // Service expects flattened args: summary, startTime, endTime
            const eventData = {
                summary,
                startTime: startTime,
                endTime: endTime
            };
            // Note: createEvent in service returns a string message, NOT the event object directly
            const resultMsg = await googleCalendarService.createEvent(authTokens, eventData);
            result = resultMsg; // "Evento creado: https://..."
        } else {
            result = "Lo siento, no entendí qué acción realizar con el calendario.";
        }

        console.log("Tool Result:", result);
        // Return JSON with 'result' property as expected by ElevenLabs tool definition
        res.json({ result });

    } catch (error) {
        console.error("Tool Error:", error);
        res.json({ result: "Tuve un problema técnico al acceder a Google Calendar." });
    }
}

module.exports = { handleCalendarTool };
