require('dotenv').config();
const express = require('express');
const axios = require('axios');
// const { OpenAI } = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

// OpenAI setup
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// Gupshup setup from env
const GUPSHUP_API_KEY = process.env.GUPSHUP_API_KEY;
const WHATSAPP_SOURCE = process.env.WHATSAPP_SOURCE || '15557921068';
const BOT_NAME = process.env.BOT_NAME || 'WhatsappCommerceOSv1';

app.use(express.json());

// ✅ Health check
app.get('/', (req, res) => {
  res.send('✅ WhatsApp AI backend is live!');
});

// 🛍️ Order initiation route
app.post('/api/whatsapp/order', async (req, res) => {
  try {
    const { phoneNumber, name, orderDetails } = req.body;
    const userMessage = `A user named ${name || "Guest"} with phone ${phoneNumber} is interested in: ${orderDetails}. 
Greet them, ask for delivery address, and suggest payment options like UPI, COD, or help.`;

    const aiResponse = await generateAIReply(userMessage);

    await axios.post('https://api.gupshup.io/sm/api/v1/msg', null, {
      params: {
        channel: 'whatsapp',
        source: WHATSAPP_SOURCE,
        destination: phoneNumber,
        message: aiResponse,
        'src.name': BOT_NAME,
      },
      headers: {
        apikey: GUPSHUP_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    console.log('✅ AI Message Sent:', aiResponse);
    res.json({ success: true, message: 'AI-driven WhatsApp message sent!' });

  } catch (error) {
    console.error('❌ Error sending order message:', error.message);
    res.status(500).json({ success: false, message: 'Failed to send message.' });
  }
});

// 🔁 Webhook for incoming WhatsApp replies
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

  const aiReply = await generateAIReply(incomingMessage);

  try {
    await axios.post('https://api.gupshup.io/sm/api/v1/msg', null, {
      params: {
        channel: 'whatsapp',
        source: WHATSAPP_SOURCE,
        destination: senderPhone,
        message: aiReply,
        'src.name': BOT_NAME,
      },
      headers: {
        apikey: GUPSHUP_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    console.log(`💬 Replied to ${senderPhone}: ${aiReply}`);
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Failed to send reply:", err.message);
    res.sendStatus(500);
  }
});

// // 🧠 Generate AI reply using ChatGPT
// async function generateAIReply(message) {
//   const chat = await openai.chat.completions.create({
//     model: "gpt-3.5-turbo",
//     messages: [
//       { role: "system", content: "You're a helpful WhatsApp shopping assistant for an e-commerce store. Guide users to checkout, answer queries, and assist politely." },
//       { role: "user", content: message }
//     ],
//   });
//   return chat.choices[0].message.content;
// }

// // 🚀 Start server
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
// });
async function generateAIReply(message) {
  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: 'mistralai/mistral-7b-instruct',
      messages: [
        {
          role: 'system',
          content: "You're a helpful WhatsApp shopping assistant for an e-commerce store. Guide users through checkout, ask for address, offer payment modes like UPI/COD, and provide support politely."
        },
        {
          role: 'user',
          content: message
        }
      ]
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://yourdomain.com',
        'X-Title': 'WhatsappCommerceOS'
      }
    }
  );

  return response.data.choices[0].message.content;
}
// 🚀 Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});