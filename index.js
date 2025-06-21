// const { OpenAI } = require("openai");
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY, // We'll define this next
// });


// // new code
// require('dotenv').config();
// const express = require('express');
// const axios = require('axios');
// const app = express();
// const PORT = process.env.PORT || 3000;

// // Gupshup config
// const GUPSHUP_API_KEY = process.env.GUPSHUP_API_KEY; // Store in Render's env vars
// const WHATSAPP_SOURCE = process.env.WHATSAPP_SOURCE || 'your_sandbox_number';
// const BOT_NAME = process.env.BOT_NAME || 'WhatsappCommerceOSv1';

// app.use(express.json());

// // Health check
// app.get('/', (req, res) => {
//   res.send('Backend is running!');
// });

// // Order endpoint
// // app.post('/api/whatsapp/order', async (req, res) => {
// //   try {
// //     const { name, phoneNumber, cart } = req.body;

// //     const cartSummary = cart.items.map(item =>
// //       `${item.product_title} x${item.quantity} - ₹${item.line_price / 100}`
// //     ).join('\n');

// //     const message =
// //       `🛍️ Hi ${name || 'there'}!\n` +
// //       `Thanks for your interest in the following items:\n\n${cartSummary}\n\n` +
// //       `To complete your order, reply with:\n👉 'Checkout'\nTo ask anything, just type your question!\n\n` +
// //       `We're here to help! 🛒`;

// //     const response = await axios.post('https://api.gupshup.io/sm/api/v1/msg', null, {
// //       params: {
// //         channel: 'whatsapp',
// //         source: WHATSAPP_SOURCE,
// //         destination: phoneNumber,
// //         message,
// //         'src.name': BOT_NAME
// //       },
// //       headers: {
// //         'apikey': GUPSHUP_API_KEY,
// //         'Content-Type': 'application/x-www-form-urlencoded'
// //       }
// //     });

// //     console.log('WhatsApp Message Sent:', response.data);
// //     res.json({ success: true, message: 'Cart sent to customer via WhatsApp!' });

// //   } catch (err) {
// //     console.error('Message Send Error:', err.message);
// //     res.status(500).json({ success: false, message: 'Failed to send message.' });
// //   }
// // });

// app.post('/api/whatsapp/order', async (req, res) => {
//   try {
//     const { phoneNumber, name, orderDetails } = req.body;

//     const userMessage = `A user named ${name} with phone ${phoneNumber} is interested in: ${orderDetails}. 
//     Greet them, ask for delivery address, and suggest payment options (UPI, COD, etc.).`;

//     const aiResponse = await generateAIReply(userMessage);

//     const response = await axios.post('https://api.gupshup.io/sm/api/v1/msg', null, {
//       params: {
//         channel: 'whatsapp',
//         source: '917834811114',
//         destination: phoneNumber,
//         message: aiResponse,
//         'src.name': 'WhatsappCommerceOSv1',
//       },
//       headers: {
//         'apikey': process.env.GUPSHUP_API_KEY,
//         'Content-Type': 'application/x-www-form-urlencoded'
//       }
//     });

//     console.log('Sent AI WhatsApp message:', aiResponse);
//     res.json({ success: true, message: 'AI-driven WhatsApp message sent!' });

//   } catch (error) {
//     console.error('Error:', error.message);
//     res.status(500).json({ success: false, message: 'Failed to send message.' });
//   }
// });


// // new code for ai




// // Webhook endpoint
// app.post('/webhook', (req, res) => {
//   console.log('Received webhook:', req.body);
//   res.sendStatus(200);
// });

// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

// async function generateAIReply(message) {
//   const chat = await openai.chat.completions.create({
//     model: "gpt-3.5-turbo", // free-tier for now
//     messages: [
//       { role: "system", content: "You're a helpful WhatsApp shopping assistant for an e-commerce brand. Be friendly, concise, and helpful." },
//       { role: "user", content: message }
//     ],
//   });

//   return chat.choices[0].message.content;
// }


// backup is up

// new start 
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { OpenAI } = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

// OpenAI setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Gupshup setup from env
const GUPSHUP_API_KEY = process.env.GUPSHUP_API_KEY;
const WHATSAPP_SOURCE = process.env.WHATSAPP_SOURCE || '15557921068'; // default your sandbox number
const BOT_NAME = process.env.BOT_NAME || 'WhatsappCommerceOSv1';

app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.send('✅ WhatsApp AI backend is live!');
});

// 👉 POST: Triggered when customer clicks 'Buy via WhatsApp'
app.post('/api/whatsapp/order', async (req, res) => {
  try {
    const { phoneNumber, name, orderDetails } = req.body;

    const userMessage = `A user named ${name || "Guest"} with phone ${phoneNumber} is interested in: ${orderDetails}. 
Greet them, ask for delivery address, and suggest payment options like UPI, COD, or help.`

    const aiResponse = await generateAIReply(userMessage);

    // Send message to customer via Gupshup
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

// 🔁 Webhook (Gupshup sends incoming user replies here)
app.post('/webhook', async (req, res) => {
  try {
    const incoming = req.body;

    const phoneNumber = incoming.payload?.source;
    const userText = incoming.payload?.payload?.payload?.text;

    if (!phoneNumber || !userText) {
      return res.status(400).json({ success: false, message: 'Invalid webhook data.' });
    }

    const aiResponse = await generateAIReply(userText);

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

    console.log('🤖 AI replied to user:', userText, '→', aiResponse);
    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Webhook handler error:', error.message);
    res.sendStatus(500);
  }
});

// 🔧 Generate AI response using OpenAI
async function generateAIReply(message) {
  const chat = await openai.chat.completions.create({
    model: "gpt-3.5-turbo", // Free-tier
    messages: [
      { role: "system", content: "You're a helpful WhatsApp shopping assistant for an e-commerce store. Guide users to checkout, answer queries, and assist politely." },
      { role: "user", content: message }
    ],
  });

  return chat.choices[0].message.content;
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
