const geminiService = require('../services/geminiService');
const tokenStore = require('../utils/tokenStore');

async function handleElevenLabsWebhook(req, res) {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] --- NEW WEBHOOK REQUEST ---`);
  console.log(`[${requestId}] Headers:`, JSON.stringify(req.headers));
  console.log(`[${requestId}] Body:`, JSON.stringify(req.body, null, 2)); // Pretty print body
  
  try {
    let text = req.body.text;
    let history = [];

    // --- 1. Extract Text and History ---
    if (!text && req.body.input && Array.isArray(req.body.input)) {
        // "input" format (Custom LLM standard)
        const validMessages = req.body.input.filter(msg => msg.role !== 'system' && msg.content);
        const lastMsg = validMessages[validMessages.length - 1];
        
        if (lastMsg && lastMsg.role === 'user') {
            text = lastMsg.content;
            // History is everything before the last message
            const historyMsgs = validMessages.slice(0, -1);
            history = historyMsgs.map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));
        } else if (lastMsg) {
             text = lastMsg.content;
        }
    } else if (!text && req.body.messages && Array.isArray(req.body.messages)) {
        // "messages" format (Legacy)
        const lastMessage = req.body.messages[req.body.messages.length - 1];
        if (lastMessage && lastMessage.content) {
            text = lastMessage.content;
        }
    } else if (!text && req.body.prompt) {
        // Fallback for simple prompt
        text = req.body.prompt;
    }

    console.log(`[${requestId}] Text extracted: "${text}"`);

    // --- 2. Input Validation ---
    if (!text) {
        console.warn(`[${requestId}] No text found. Sending default response.`);
        const response = { response: "No te entendí, ¿puedes repetir?", continue: true };
        console.log(`[${requestId}] Sending Response:`, JSON.stringify(response));
        return res.json(response);
    }

    // --- 3. History Sanitization ---
    // Ensure history starts with 'user'
    const firstUserIndex = history.findIndex(h => h.role === 'user');
    if (firstUserIndex !== -1) {
        history = history.slice(firstUserIndex);
    } else {
        history = [];
    }

    // --- 4. Auth (Permissive for Demo) ---
    const userId = req.headers['x-user-id'] || req.query.userId || 'demo-user';
    let authTokens = tokenStore.getToken(userId);
    if (!authTokens) {
        const allUsers = tokenStore.getAllUsers();
        if (allUsers.length > 0) authTokens = tokenStore.getToken(allUsers[0]);
    }

    if (!authTokens) {
        console.log(`[${requestId}] No auth tokens. Sending auth prompt.`);
        const response = { 
            response: "Por favor, inicia sesión en la web para continuar. Necesito acceso a tu calendario.", 
            continue: false 
        };
        console.log(`[${requestId}] Sending Response:`, JSON.stringify(response));
        return res.json(response);
    }

    // --- 5. Process with Gemini (BYPASSED FOR DIAGNOSIS) ---
    console.log(`[${requestId}] [${Date.now() - start}ms] BYPASSING GEMINI FOR DIAGNOSIS...`);
    
    // Simulating immediate response to test ElevenLabs connection stability
    let responseText = "Conexión exitosa con el servidor Cero. El sistema de voz está funcionando correctamente. ¿En qué te ayudo con tu agenda?";
    
    console.log(`[${requestId}] [${Date.now() - start}ms] Response ready: "${responseText}"`);

    // --- 6. Send Response (JSON Standard) ---
    const jsonResponse = {
        response: responseText,
        continue: true
    };
    
    console.log(`[${requestId}] [${Date.now() - start}ms] Sending JSON response:`, JSON.stringify(jsonResponse));
    res.json(jsonResponse);

  } catch (error) {
    console.error(`[${requestId}] Error handling webhook:`, error);
    res.status(500).json({ 
        response: "Ocurrió un error técnico en mi cerebro. Intenta de nuevo.", 
        continue: false 
    });
  }
}

module.exports = {
  handleElevenLabsWebhook,
};