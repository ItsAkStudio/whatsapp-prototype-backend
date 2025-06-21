// require('dotenv').config();
// const express = require('express');
// const axios = require('axios');
// // const { OpenAI } = require('openai');

// const app = express();
// const PORT = process.env.PORT || 3000;

// // OpenAI setup
// // const openai = new OpenAI({
// //   apiKey: process.env.OPENAI_API_KEY,
// // });

// // Gupshup setup from env
// const GUPSHUP_API_KEY = process.env.GUPSHUP_API_KEY;
// const WHATSAPP_SOURCE = process.env.WHATSAPP_SOURCE || '15557921068';
// const BOT_NAME = process.env.BOT_NAME || 'WhatsappCommerceOSv1';

// app.use(express.json());

// // ✅ Health check
// app.get('/', (req, res) => {
//   res.send('✅ WhatsApp AI backend is live!');
// });

// // 🛍️ Order initiation route
// app.post('/api/whatsapp/order', async (req, res) => {
//   try {
//     const { phoneNumber, name, orderDetails } = req.body;
//     const userMessage = `A user named ${name || "Guest"} with phone ${phoneNumber} is interested in: ${orderDetails}. 
// Greet them, ask for delivery address, and suggest payment options like UPI, COD, or help.`;

//     const aiResponse = await generateAIReply(userMessage);

//     await axios.post('https://api.gupshup.io/sm/api/v1/msg', null, {
//       params: {
//         channel: 'whatsapp',
//         source: WHATSAPP_SOURCE,
//         destination: phoneNumber,
//         message: aiResponse,
//         'src.name': BOT_NAME,
//       },
//       headers: {
//         apikey: GUPSHUP_API_KEY,
//         'Content-Type': 'application/x-www-form-urlencoded',
//       },
//     });

//     console.log('✅ AI Message Sent:', aiResponse);
//     res.json({ success: true, message: 'AI-driven WhatsApp message sent!' });

//   } catch (error) {
//     console.error('❌ Error sending order message:', error.message);
//     res.status(500).json({ success: false, message: 'Failed to send message.' });
//   }
// });

// // 🔁 Webhook for incoming WhatsApp replies
// app.post('/webhook', async (req, res) => {
//   const payload = req.body;

//   if (!payload || payload.type !== 'message') {
//     return res.sendStatus(200);
//   }

//   const incomingMessage = payload.payload?.payload?.text || '';
//   const senderPhone = payload.payload?.sender?.phone;

//   if (!senderPhone || !incomingMessage) {
//     console.log("⚠️ Missing phone or message");
//     return res.sendStatus(200);
//   }

//   const aiReply = await generateAIReply(incomingMessage);

//   try {
//     await axios.post('https://api.gupshup.io/sm/api/v1/msg', null, {
//       params: {
//         channel: 'whatsapp',
//         source: WHATSAPP_SOURCE,
//         destination: senderPhone,
//         message: aiReply,
//         'src.name': BOT_NAME,
//       },
//       headers: {
//         apikey: GUPSHUP_API_KEY,
//         'Content-Type': 'application/x-www-form-urlencoded',
//       },
//     });

//     console.log(`💬 Replied to ${senderPhone}: ${aiReply}`);
//     res.sendStatus(200);
//   } catch (err) {
//     console.error("❌ Failed to send reply:", err.message);
//     res.sendStatus(500);
//   }
// });

// // // 🧠 Generate AI reply using ChatGPT
// // async function generateAIReply(message) {
// //   const chat = await openai.chat.completions.create({
// //     model: "gpt-3.5-turbo",
// //     messages: [
// //       { role: "system", content: "You're a helpful WhatsApp shopping assistant for an e-commerce store. Guide users to checkout, answer queries, and assist politely." },
// //       { role: "user", content: message }
// //     ],
// //   });
// //   return chat.choices[0].message.content;
// // }

// // // 🚀 Start server
// // app.listen(PORT, () => {
// //   console.log(`🚀 Server running on port ${PORT}`);
// // });
// async function generateAIReply(message) {
//   const response = await axios.post(
//     'https://openrouter.ai/api/v1/chat/completions',
//     {
//       model: 'mistralai/mistral-7b-instruct',
//       messages: [
//         {
//           role: 'system',
//           content: "You're a helpful WhatsApp shopping assistant for an e-commerce store. Guide users through checkout, ask for address, offer payment modes like UPI/COD, and provide support politely."
//         },
//         {
//           role: 'user',
//           content: message
//         }
//       ]
//     },
//     {
//       headers: {
//         Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
//         'Content-Type': 'application/json',
//         'HTTP-Referer': 'https://yourdomain.com',
//         'X-Title': 'WhatsappCommerceOS'
//       }
//     }
//   );

//   return response.data.choices[0].message.content;
// }
// // 🚀 Start server
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
// });

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Environment variables (no hardcoded defaults)
const GUPSHUP_API_KEY = process.env.GUPSHUP_API_KEY;
const WHATSAPP_SOURCE = process.env.WHATSAPP_SOURCE;
const BOT_NAME = process.env.BOT_NAME || 'WhatsappCommerceOSv1';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!GUPSHUP_API_KEY || !WHATSAPP_SOURCE || !OPENROUTER_API_KEY) {
  throw new Error('Missing one or more required environment variables.');
}

app.use(express.json());

// Simple in-memory session store (for prototype)
const sessions = new Map();

// Utility: Format message for WhatsApp (limit to 4096 chars)
const formatResponse = (text) => text.replace(/\n+/g, '\n').substring(0, 4096);

// Health check
app.get('/', (req, res) => {
  res.send('✅ WhatsApp AI backend is live!');
});

// Order initiation route
app.post('/api/whatsapp/order', async (req, res) => {
  try {
    const { phoneNumber, name, orderDetails } = req.body;
    if (!phoneNumber || !orderDetails) {
      return res.status(400).json({ success: false, message: 'Missing phoneNumber or orderDetails.' });
    }
    const userMessage = `A user named ${name || "Guest"} with phone ${phoneNumber} is interested in: ${orderDetails}. 
Greet them, ask for delivery address, and suggest payment options like UPI, COD, or help.`;

    // Track conversation state
    const sessionId = phoneNumber;
    if (!sessions.has(sessionId)) sessions.set(sessionId, []);
    const conversationHistory = sessions.get(sessionId);
    conversationHistory.push({ role: 'user', content: userMessage });

    const aiResponse = await generateAIReply(conversationHistory);

    await sendWhatsAppMessage(phoneNumber, aiResponse);

    conversationHistory.push({ role: 'assistant', content: aiResponse });

    console.log('✅ AI Message Sent:', aiResponse.substring(0, 80));
    res.json({ success: true, message: 'AI-driven WhatsApp message sent!' });

  } catch (error) {
    console.error('❌ Error sending order message:', error.message);
    res.status(500).json({ success: false, message: 'Failed to send message.' });
  }
});

// Webhook rate limiter
const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use('/webhook', webhookLimiter);

// Webhook for incoming WhatsApp replies
app.post('/webhook', async (req, res) => {
  const payload = req.body;

  if (!payload || payload.type !== 'message') {
    return res.sendStatus(200);
  }

  const incomingMessage = payload.payload?.payload?.text || '';
  const senderPhone = payload.payload?.sender?.phone;

  if (!senderPhone || !incomingMessage) {
    console.log("⚠️ Missing phone or message");
    return res.sendStatus(200);
  }

  // Track conversation state
  const sessionId = senderPhone;
  if (!sessions.has(sessionId)) sessions.set(sessionId, []);
  const conversationHistory = sessions.get(sessionId);
  conversationHistory.push({ role: 'user', content: incomingMessage });

  try {
    const aiReply = await generateAIReply(conversationHistory);

    await sendWhatsAppMessage(senderPhone, aiReply);

    conversationHistory.push({ role: 'assistant', content: aiReply });

    console.log(`💬 Replied to ${senderPhone}: ${aiReply.substring(0, 80)}`);
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Failed to send reply:", err.message);
    res.sendStatus(500);
  }
});

// Send WhatsApp message via Gupshup
async function sendWhatsAppMessage(destination, message) {
  await axios.post(
    'https://api.gupshup.io/sm/api/v1/msg',
    new URLSearchParams({
      channel: 'whatsapp',
      source: WHATSAPP_SOURCE,
      destination,
      message: formatResponse(message),
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

// Generate AI reply using OpenRouter
async function generateAIReply(conversationHistory) {
  // Only send the last 3 exchanges to control context size/cost
  const recentHistory = conversationHistory.slice(-3);

  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: 'mistralai/mistral-7b-instruct',
      messages: [
        {
          role: 'system',
          content: "You're a helpful WhatsApp shopping assistant for an e-commerce store. Guide users through checkout, ask for address, offer payment modes like UPI/COD, and provide support politely."
        },
        ...recentHistory
      ],
      max_tokens: 150
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
  console.log(`🚀 Server running on port ${PORT}`);
});

app.post('/test-ai', async (req, res) => {
  const { message } = req.body;
  const aiReply = await generateAIReply([{ role: 'user', content: message }]);
  res.json({ aiReply });
});