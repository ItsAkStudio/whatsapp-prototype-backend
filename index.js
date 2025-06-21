// const express = require('express');
// const axios = require('axios');
// const app = express();
// const PORT = process.env.PORT || 3000;

// // Replace with your actual Gupshup API Key
// const GUPSHUP_API_KEY = process.env.GUPSHUP_API_KEY;

// app.use(express.json());

// // Health check
// app.get('/', (req, res) => {
//   res.send('Backend is running!');
// });

// // Order endpoint
// app.post('/api/whatsapp/order', async (req, res) => {
//   try {
//     const { phoneNumber, name, orderDetails } = req.body;

//     const message = `🛒 Hello ${name}, thanks for your order! We’ll get it to you soon.\nOrder Details: ${orderDetails}`;

//     const response = await axios.post('https://api.gupshup.io/sm/api/v1/msg', null, {
//       params: {
//         channel: 'whatsapp',
//         source: '917834811114', // Your Gupshup sandbox number
//         destination: phoneNumber, // Customer number
//         message: `🛍️ Thanks for your interest! 
// Product: Retinol Night Cream
// Qty: 1
// Total: ₹499
// Pay here: https://pay.test/ORD123

// Reply to confirm your order. 😊`,
//         'src.name': 'WhatsappCommerceOSv1'
//       },
//       headers: {
//         apikey: GUPSHUP_API_KEY,
//         'Content-Type': 'application/x-www-form-urlencoded'
//       }
//     });


//     console.log('Message API response:', response.data);
//     res.json({ success: true, message: 'WhatsApp message sent!' });
//   } catch (error) {
//     console.error('Error sending WhatsApp message:', error.message);
//     res.status(500).json({ success: false, message: 'Failed to send WhatsApp message.' });
//   }
// });
// previos one 

// new code
const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// Gupshup config
const GUPSHUP_API_KEY = process.env.GUPSHUP_API_KEY; // Store in Render's env vars
const WHATSAPP_SOURCE = process.env.WHATSAPP_SOURCE || 'your_sandbox_number';
const BOT_NAME = process.env.BOT_NAME || 'WhatsappCommerceOSv1';

app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.send('Backend is running!');
});

// Order endpoint
app.post('/api/whatsapp/order', async (req, res) => {
  try {
    const { name, phoneNumber, cart } = req.body;

    const cartSummary = cart.items.map(item => 
      `${item.product_title} x${item.quantity} - ₹${item.line_price / 100}`
    ).join('\n');

    const message = 
      `🛍️ Hi ${name || 'there'}!\n` +
      `Thanks for your interest in the following items:\n\n${cartSummary}\n\n` +
      `To complete your order, reply with:\n👉 'Checkout'\nTo ask anything, just type your question!\n\n` +
      `We're here to help! 🛒`;

    const response = await axios.post('https://api.gupshup.io/sm/api/v1/msg', null, {
      params: {
        channel: 'whatsapp',
        source: WHATSAPP_SOURCE,
        destination: phoneNumber,
        message,
        'src.name': BOT_NAME
      },
      headers: {
        'apikey': GUPSHUP_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('WhatsApp Message Sent:', response.data);
    res.json({ success: true, message: 'Cart sent to customer via WhatsApp!' });

  } catch (err) {
    console.error('Message Send Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to send message.' });
  }
});


// Webhook endpoint
app.post('/webhook', (req, res) => {
  console.log('Received webhook:', req.body);
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
