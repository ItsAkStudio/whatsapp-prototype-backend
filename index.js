require('dotenv').config();
const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// ENV Variables
const AISENSY_API_KEY = process.env.AISENSY_API_KEY;
const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!AISENSY_API_KEY || !WHATSAPP_NUMBER || !OPENROUTER_API_KEY) {
  throw new Error('❌ Missing environment variables');
}

app.use(express.json());

// Simple in-memory session store
const sessions = new Map();

app.get('/', (_, res) => res.send('✅ AiSensy + AI WhatsApp backend is live!'));

// Send initial order message
app.post('/api/whatsapp/order', async (req, res) => {
  try {
    const { phoneNumber, name, orderDetails } = req.body;

    const sessionId = phoneNumber;
    const message = `User ${name || "Guest"} wants to order: ${orderDetails}. Greet, ask for delivery address, and show payment options.`;

    if (!sessions.has(sessionId)) sessions.set(sessionId, []);
    const history = sessions.get(sessionId);
    history.push({ role: 'user', content: message });

    const aiResponse = await generateAIReply(history);
    await sendViaAiSensy(phoneNumber, aiResponse);
    history.push({ role: 'assistant', content: aiResponse });

    res.json({ success: true, message: 'AI-driven WhatsApp message sent!' });
  } catch (err) {
    console.error('❌ Order error:', err.message);
    res.status(500).json({ success: false, message: 'Message send failed' });
  }
});

// Incoming replies
app.post('/webhook', async (req, res) => {
  const { phone, message } = req.body;

  if (!phone || !message) return res.sendStatus(200);
  const sessionId = phone;

  if (!sessions.has(sessionId)) sessions.set(sessionId, []);
  const history = sessions.get(sessionId);
  history.push({ role: 'user', content: message });

  try {
    const aiReply = await generateAIReply(history);
    await sendViaAiSensy(phone, aiReply);
    history.push({ role: 'assistant', content: aiReply });

    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Webhook reply error:', err.message);
    res.sendStatus(500);
  }
});

// Send message via AiSensy
async function sendViaAiSensy(destination, message) {
  const payload = {
    to: destination,
    type: "text",
    text: { body: message }
  };

  await axios.post('https://backend.aisensy.com/campaign/message', payload, {
    headers: {
      Authorization: `Bearer ${AISENSY_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
}

// AI Reply
async function generateAIReply(history) {
  const recentHistory = history.slice(-3);
  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: 'mistralai/mistral-7b-instruct',
      messages: [
        { role: 'system', content: "You're a helpful shopping assistant on WhatsApp for an e-commerce brand." },
        ...recentHistory
      ],
      max_tokens: 200
    },
    {
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://yourdomain.com',
        'X-Title': 'WhatsappCommerceOS'
      }
    }
  );

  return response.data.choices[0].message.content.trim();
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AiSensy + AI Server running on port ${PORT}`);
});
