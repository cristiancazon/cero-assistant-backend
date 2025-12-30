const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const calendarService = require('./calendarService');
// const tasksService = require('./tasksService'); // Disable Tasks for now

// Initialize Gemini AI
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("WARNING: GEMINI_API_KEY is not set in .env file. AI features will fail.");
}

const genAI = new GoogleGenerativeAI(apiKey);

// Tool Definitions
const createCalendarEventTool = {
  name: 'create_calendar_event',
  description: 'Creates a new event in the user\'s Google Calendar.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      summary: { type: SchemaType.STRING, description: 'Title of the event' },
      startTime: { type: SchemaType.STRING, description: 'Start time in ISO 8601 format (YYYY-MM-DDTHH:mm:ss)' },
      endTime: { type: SchemaType.STRING, description: 'End time in ISO 8601 format (YYYY-MM-DDTHH:mm:ss)' },
    },
    required: ['summary', 'startTime', 'endTime'],
  },
};

const listCalendarEventsTool = {
  name: 'list_calendar_events',
  description: 'Lists upcoming events from the user\'s calendar.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      timeMin: { type: SchemaType.STRING, description: 'Start time to fetch events from (ISO 8601). Defaults to now.' },
      maxResults: { type: SchemaType.INTEGER, description: 'Maximum number of events to return.' },
    },
    required: [],
  },
};

// Define the tools array
const tools = [
  {
    functionDeclarations: [createCalendarEventTool, listCalendarEventsTool],
  },
];

const modelName = 'gemini-2.0-flash';

async function processUserMessage(text, history, authTokens) {
  if (!apiKey) {
    return "Error de configuración: Falta la API Key de Gemini en el servidor.";
  }

  // Dynamic Date Generation per request
  const now = new Date();
  const options = { timeZone: 'America/Argentina/Buenos_Aires', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
  const localTime = now.toLocaleString('es-AR', options);

  const SYSTEM_INSTRUCTION = `
You are Cero, an advanced executive assistant AI.
Your goal is to manage the user's calendar and tasks efficiently.
Current Date and Time (GMT-3): ${localTime}
Timezone: America/Argentina/Buenos_Aires (GMT-3).

CRÍTICO - PROTOCOLO DE USO DE HERRAMIENTAS:
1. TU NO PUEDES realizar acciones en el mundo real (agendar, leer, marcar) solo con texto.
2. PARA CUALQUIER ACCIÓN (Crear evento, Ver agenda, Completar tarea), DEBES generar una llamada a función (Function Call).
3. NUNCA respondas "He creado el evento" o "Aquí tienes tus tareas" si no has invocado una herramienta primero.
4. Si faltan datos obligatorios para una función, PREGUNTA al usuario.
5. Si el usuario pide agendar, USA \`create_calendar_event\`.
6. IMPORTANTE: Tu respuesta final será convertida a audio.
   - Sé conciso y natural.
   - NO incluyas URLs, IDs largos ni símbolos complejos en el texto hablado.
   - Si creas un evento, confirma la hora y fecha verbalmente (ej: "Listo, agendé la reunión para mañana a las 3 de la tarde").
`;

  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: SYSTEM_INSTRUCTION,
    tools: tools,
    toolConfig: { functionCallingConfig: { mode: 'AUTO' } }
  });

  const chatSession = model.startChat({
    history: history,
    generationConfig: {
      maxOutputTokens: 256,
      temperature: 0.2,
    },
  });

  // Ensure text is not undefined
  if (!text) {
    console.log("processUserMessage received undefined text");
    return "Hubo un error de comunicación.";
  }

  try {
    console.log('[DEBUG] Sending to Gemini:', text);
    console.log('[DEBUG] History length:', history.length);
    
    const result = await chatSession.sendMessage(text);
    const response = await result.response;
    const candidates = response.candidates;
    
    if (!candidates || candidates.length === 0) {
      return "Lo siento, no pude procesar tu solicitud.";
    }

    const candidate = candidates[0];
    console.log('[DEBUG] Gemini Candidate Content:', JSON.stringify(candidate.content, null, 2));

    // Check for function calls
    // Note: The new SDK structure might be slightly different, but usually parts are similar.
    // candidate.content.parts[0].functionCall
    
    for (const part of candidate.content.parts) {
      if (part.functionCall) {
        const functionName = part.functionCall.name;
        const args = part.functionCall.args;

        console.log(`[DEBUG] Gemini requesting function: ${functionName}`);

        let functionResponse;
        try {
          if (functionName === 'create_calendar_event') {
            functionResponse = await calendarService.createEvent(authTokens, args);
          } else if (functionName === 'list_calendar_events') {
            functionResponse = await calendarService.listEvents(authTokens, args);
          } else {
            functionResponse = "Función no reconocida.";
          }
        } catch (error) {
          console.error(`Error executing function ${functionName}:`, error);
          functionResponse = `Error al ejecutar la acción: ${error.message}`;
        }

        // Send function result back to Gemini
        const result2 = await chatSession.sendMessage([
          {
            functionResponse: {
              name: functionName,
              response: { content: functionResponse },
            },
          },
        ]);

        return result2.response.text();
      }
    }

    return response.text();
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    
    // RETRY STRATEGY: If it failed with history, try without history (Context loss is better than crash)
    if (history.length > 0) {
        console.log('[WARN] Retrying Gemini request WITHOUT history to recover from error...');
        try {
            const statelessModel = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: SYSTEM_INSTRUCTION,
                tools: tools,
                toolConfig: { functionCallingConfig: { mode: 'AUTO' } }
            });
            
            const statelessSession = statelessModel.startChat({
                history: [], // Empty history
                generationConfig: { maxOutputTokens: 256, temperature: 0.2 },
            });
            
            const retryResult = await statelessSession.sendMessage(text);
            return retryResult.response.text();
        } catch (retryError) {
            console.error('Error in retry without history:', retryError);
            return "Lo siento, estoy teniendo problemas técnicos serios en este momento.";
        }
    }

    return "Lo siento, hubo un error al conectar con mi cerebro.";
  }
}

module.exports = {
  processUserMessage,
};
