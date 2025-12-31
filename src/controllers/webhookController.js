const geminiService = require('../services/geminiService');
const tokenStore = require('../utils/tokenStore');

async function handleElevenLabsWebhook(req, res) {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] --- NEW WEBHOOK REQUEST ---`);
  // Log summary instead of full body to avoid spam/truncation
  console.log(`[${requestId}] Headers:`, JSON.stringify(req.headers));
  console.log(`[${requestId}] Body Keys:`, Object.keys(req.body));
  
  try {
    let text = req.body.text;
    let history = [];

    // --- 1. Extract Text and History ---
    if (!text && req.body.input && Array.isArray(req.body.input)) {
        // "input" format (Custom LLM standard)
        // Filter out system messages AND messages that look like system prompts (long, contain "Task description")
        const validMessages = req.body.input.filter(msg => {
            if (msg.role === 'system') return false;
            if (msg.content && msg.content.includes("Task description:")) return false;
            return !!msg.content;
        });
        
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

    // --- 5. Process with Gemini (Restored with Timeout Protection) ---
    console.log(`[${requestId}] [${Date.now() - start}ms] Sending to Gemini...`);
    
    // Create a promise that rejects/resolves after 5 seconds to prevent ElevenLabs timeout
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Gemini Timeout")), 5000);
    });

    let responseText;
    try {
        // Race between Gemini and Timeout
        responseText = await Promise.race([
            geminiService.processUserMessage(text, history, authTokens),
            timeoutPromise
        ]);
    } catch (err) {
        console.error(`[${requestId}] Gemini/Timeout Error:`, err);
        if (err.message === "Gemini Timeout") {
            responseText = "Lo siento, estoy tardando un poco más de lo normal en pensar. ¿Podrías repetirme eso?";
        } else {
            responseText = "Tuve un pequeño problema técnico procesando eso.";
        }
    }
    
    // Clean up text: Remove markdown, asterisks, excessive whitespace
    if (responseText) {
        responseText = responseText.replace(/\*/g, '').replace(/\s+/g, ' ').trim();
    } else {
        responseText = "No pude generar una respuesta.";
    }
    
    console.log(`[${requestId}] [${Date.now() - start}ms] Gemini response (cleaned): "${responseText}"`);

    // --- 6. Send Response (JSON Standard) ---
    // Only 'response' is strictly required. 'continue' is implicit.
    const jsonResponse = {
        response: responseText
    };
    
    console.log(`[${requestId}] [${Date.now() - start}ms] Sending JSON response:`, JSON.stringify(jsonResponse));
    
    // Explicitly set headers to avoid any ambiguity
    res.setHeader('Content-Type', 'application/json');
    res.json(jsonResponse);

  } catch (error) {
    console.error(`[${requestId}] Error handling webhook:`, error);
    // Even in total failure, return a valid JSON so ElevenLabs speaks the error
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({ 
        response: "Ocurrió un error técnico crítico en el servidor." 
    });
  }
}

module.exports = {
  handleElevenLabsWebhook,
};