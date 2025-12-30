const geminiService = require('../services/geminiService');
const tokenStore = require('../utils/tokenStore');

// Simple in-memory cache for idempotency
const processedRequests = new Set();

async function handleElevenLabsWebhook(req, res) {
  const start = Date.now();
  console.log('--- NEW WEBHOOK REQUEST ---');
  
  try {
    let text = req.body.text;
    const conversation_id = req.body.conversation_id;
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
    }

    console.log(`[${Date.now() - start}ms] Text extracted: "${text}"`);

    // --- 2. Input Validation ---
    if (!text) {
        console.warn("No text found. Sending default response.");
        return sendStreamResponse(res, "No te entendí, ¿puedes repetir?");
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
        return sendStreamResponse(res, "Por favor, inicia sesión en la web para continuar.");
    }

    // --- 5. Process with Gemini ---
    console.log(`[${Date.now() - start}ms] Sending to Gemini...`);
    let responseText = await geminiService.processUserMessage(text, history, authTokens);
    
    // Clean up text: Remove markdown, asterisks, excessive whitespace
    responseText = responseText.replace(/\*/g, '').replace(/\s+/g, ' ').trim();
    
    console.log(`[${Date.now() - start}ms] Gemini response (cleaned): "${responseText}"`);

    if (!responseText) responseText = "Lo siento, tuve un problema.";

    // --- 6. Send Response (Streaming) ---
    console.log(`[${Date.now() - start}ms] Starting stream response...`);
    await sendStreamResponse(res, responseText);
    console.log(`[${Date.now() - start}ms] Stream finished & Request completed.`);

  } catch (error) {
    console.error('Error handling webhook:', error);
    if (!res.headersSent) {
        sendStreamResponse(res, "Ocurrió un error técnico.");
    } else {
        res.end();
    }
  }
}

// Helper for consistent streaming
async function sendStreamResponse(res, text) {
    if (!res.headersSent) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); 
    }

    const chunkId = "chatcmpl-" + Date.now();
    const created = Math.floor(Date.now() / 1000);

    // SIMPLE STRATEGY: Send the entire response in ONE SINGLE CHUNK
    // This is the most reliable way to ensure ElevenLabs reads the full sentence.
    
    const chunk = {
        id: chunkId,
        object: "chat.completion.chunk",
        created: created,
        model: "gemini-proxy",
        choices: [{ 
            index: 0, 
            delta: { content: text }, // FULL TEXT
            finish_reason: null 
        }]
    };
    
    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    
    // Tiny delay just to be safe before closing
    await new Promise(r => setTimeout(r, 50));

    // Finish
    const finish = {
        id: chunkId,
        object: "chat.completion.chunk",
        created: created,
        model: "gemini-proxy",
        choices: [{ index: 0, delta: {}, finish_reason: "stop" }]
    };
    res.write(`data: ${JSON.stringify(finish)}\n\n`);
    res.write(`data: [DONE]\n\n`);
    
    res.end();
}

module.exports = {
  handleElevenLabsWebhook,
};