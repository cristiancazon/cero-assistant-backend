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
        console.log("Tool Error: No auth tokens found in memory.");
        return res.status(401).json({ 
            result: "Error: No has iniciado sesión en Cero. Por favor entra a la web y conecta tu calendario." 
        });
    }

    try {
        console.log("Tool Action:", req.body.action);
        // Robust parameter extraction handling different casing/naming conventions
        const action = req.body.action;
        const summary = req.body.summary || req.body.title || "Evento sin título";
        const startTime = req.body.startTime || req.body.start_time || req.body.start;
        const endTime = req.body.endTime || req.body.end_time || req.body.end;
        const timeMin = req.body.timeMin || req.body.time_min;
        const timeMax = req.body.timeMax || req.body.time_max;

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
            if (!startTime || !endTime) {
                console.error("Missing start/end time. Body:", JSON.stringify(req.body));
                return res.json({ result: "Error: No pude entender la fecha y hora de inicio o fin. Por favor repítelo." });
            }

            // Service expects flattened args: summary, startTime, endTime
            const eventData = {
                summary,
                startTime: startTime,
                endTime: endTime
            };
            // Note: createEvent in service returns a string message, NOT the event object directly
            const resultMsg = await googleCalendarService.createEvent(authTokens, eventData);
            console.log("Tool Success Create:", resultMsg);
            result = resultMsg; // "Evento creado: https://..."
        } else {
            result = "Acción no reconocida.";
        }

        console.log("Tool Result:", result);
        res.json({ result });

    } catch (error) {
        console.error("Tool Error Catch:", error);
        res.status(500).json({ result: "Hubo un error técnico en el servidor Cero." });
    }
}

module.exports = { handleCalendarTool };
