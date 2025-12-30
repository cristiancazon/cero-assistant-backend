const geminiService = require('../services/geminiService');
const tokenStore = require('../utils/tokenStore');

async function handleElevenLabsWebhook(req, res) {
  const start = Date.now();
  console.log('--- NEW WEBHOOK REQUEST (JSON MODE) ---');
  
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

    console.log(`[${Date.now() - start}ms] Text extracted: "${text}"`);

    // --- 2. Input Validation ---
    if (!text) {
        console.warn("No text found. Sending default response.");
        return res.json({ response: "No te entendí, ¿puedes repetir?", continue: true });
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
        console.log("No auth tokens. Sending auth prompt.");
        return res.json({ 
            response: "Por favor, inicia sesión en la web para continuar. Necesito acceso a tu calendario.", 
            continue: false 
        });
    }

    // --- 5. Process with Gemini ---
    console.log(`[${Date.now() - start}ms] Sending to Gemini...`);
    let responseText = await geminiService.processUserMessage(text, history, authTokens);
    
    // Clean up text: Remove markdown, asterisks, excessive whitespace
    responseText = responseText.replace(/\*/g, '').replace(/\s+/g, ' ').trim();
    
    console.log(`[${Date.now() - start}ms] Gemini response (cleaned): "${responseText}"`);

    if (!responseText) responseText = "Lo siento, tuve un problema.";

    // --- 6. Send Response (JSON Standard) ---
    // This is the format ElevenLabs expects for non-streaming Custom LLM
    const jsonResponse = {
        response: responseText,
        continue: true
    };
    
    console.log(`[${Date.now() - start}ms] Sending JSON response...`);
    res.json(jsonResponse);

  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ 
        response: "Ocurrió un error técnico en mi cerebro. Intenta de nuevo.", 
        continue: false 
    });
  }
}

module.exports = {
  handleElevenLabsWebhook,
};