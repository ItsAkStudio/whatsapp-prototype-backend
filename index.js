require('dotenv').config();
const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Load Environment Variables
const GUPSHUP_API_KEY = process.env.GUPSHUP_API_KEY;
const WHATSAPP_SOURCE = process.env.WHATSAPP_SOURCE;
const BOT_NAME = process.env.BOT_NAME || 'WhatsappCommerceAI';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!GUPSHUP_API_KEY || !WHATSAPP_SOURCE || !OPENROUTER_API_KEY) {
  throw new Error('❌ Missing required environment variables');
}

app.use(express.json());

// ✅ Track conversation sessions
const sessions = new Map();
const formatMessage = (text) => text.trim().replace(/\n{2,}/g, '\n').substring(0, 4096);

// ✅ Health Check
app.get('/', (req, res) => {
  res.send('✅ WhatsApp AI Backend is live');
});

// ✅ Order Message Endpoint
app.post('/api/whatsapp/order', async (req, res) => {
  try {
    const { phoneNumber, name, orderDetails } = req.body;
    if (!phoneNumber || !orderDetails) {
      return res.status(400).json({ success: false, message: 'Missing phoneNumber or orderDetails' });
    }

    const sessionId = phoneNumber;
    if (!sessions.has(sessionId)) sessions.set(sessionId, []);
    const conversation = sessions.get(sessionId);

    const introMsg = `A user named ${name || "Guest"} is interested in: ${orderDetails}. Ask for their delivery address and offer payment options (UPI, COD).`;
    conversation.push({ role: 'user', content: introMsg });

    const aiReply = await generateAIReply(conversation);
    await sendWhatsAppMessage(phoneNumber, aiReply);

    conversation.push({ role: 'assistant', content: aiReply });
    console.log(`✅ Sent AI reply to ${phoneNumber}: ${aiReply.slice(0, 80)}...`);

    res.json({ success: true, message: 'AI message sent via WhatsApp' });

  } catch (error) {
    console.error('❌ Order Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to send WhatsApp message' });
  }
});

// ✅ Webhook (Gupshup Reply Handler)
app.post('/webhook', rateLimit({ windowMs: 60_000, max: 100 }), async (req, res) => {
  const payload = req.body;

  if (payload?.type !== 'message') return res.sendStatus(200);

  const message = payload.payload?.payload?.text;
  const sender = payload.payload?.sender?.phone;

  if (!message || !sender) {
    console.warn('⚠️ Missing message or sender info');
    return res.sendStatus(200);
  }

  try {
    const session = sessions.get(sender) || [];
    session.push({ role: 'user', content: message });
    sessions.set(sender, session);

    const aiReply = await generateAIReply(session);
    session.push({ role: 'assistant', content: aiReply });

    await sendWhatsAppMessage(sender, aiReply);
    console.log(`💬 Replied to ${sender}: ${aiReply.slice(0, 80)}...`);

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Webhook Error:", err.message);
    res.sendStatus(500);
  }
});

// ✅ AI Reply (OpenRouter - Mistral)
async function generateAIReply(messages) {
  const recentMessages = messages.slice(-3); // Limit context
  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: 'mistralai/mistral-7b-instruct',
      messages: [
        {
          role: 'system',
          content: "You're a helpful WhatsApp shopping assistant. Guide users, ask for address, offer UPI/COD, and provide polite support."
        },
        ...recentMessages
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

  return formatMessage(response.data.choices[0].message.content);
}

// ✅ Gupshup Send Message
async function sendWhatsAppMessage(destination, message) {
  await axios.post(
    'https://api.gupshup.io/sm/api/v1/msg',
    new URLSearchParams({
      channel: 'whatsapp',
      source: WHATSAPP_SOURCE,
      destination,
      message,
      'src.name': BOT_NAME
    }),
    {
      headers: {
        apikey: GUPSHUP_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );
}

const Razorpay = require('razorpay');

// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// API to create payment order
app.post('/api/payment/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt = `receipt_order_${Date.now()}` } = req.body;

    const order = await razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency,
      receipt,
      payment_capture: 1
    });

    res.json({ success: true, order });
  } catch (error) {
    console.error('❌ Razorpay Order Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to create payment order' });
  }
});


// ✅ Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// ✅ Test AI Response (Postman)
app.post('/test-ai', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ success: false, error: 'Message is required' });

  try {
    const aiReply = await generateAIReply([{ role: 'user', content: message }]);
    res.json({ success: true, aiReply });
  } catch (err) {
    console.error('❌ /test-ai Error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to get AI reply' });
  }
});

// ✅ Test Gupshup Messaging (Postman)
app.post('/test-gupshup', async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) return res.status(400).json({ success: false, message: 'Missing phoneNumber' });

  try {
    const testMessage = '🧪 Gupshup test successful!';
    await sendWhatsAppMessage(phoneNumber, testMessage);
    res.json({ success: true, message: 'Test message sent!' });
  } catch (err) {
    console.error('❌ Gupshup Test Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to send Gupshup test message' });
  }
});

const Razorpay = require("razorpay");
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY,
  key_secret: process.env.RAZORPAY_SECRET
});
const response = await razorpay.paymentLink.create({
  amount: 50000,
  currency: "INR",
  description: "Order for XYST product",
  customer: { name: "Customer", contact: phoneNumber },
  notify: { sms: false, email: false },
  callback_url: "https://yourstore.com/payment-success",
  callback_method: "get"
});
