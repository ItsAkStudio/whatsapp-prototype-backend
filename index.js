const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// Replace with your actual Gupshup API Key
const GUPSHUP_API_KEY = process.env.GUPSHUP_API_KEY;

app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.send('Backend is running!');
});

// Order endpoint
app.post('/api/whatsapp/order', async (req, res) => {
  try {
    const { phoneNumber, name, orderDetails } = req.body;

    const message = `🛒 Hello ${name}, thanks for your order! We’ll get it to you soon.\nOrder Details: ${orderDetails}`;

    const response = await axios.post('https://api.gupshup.io/sm/api/v1/msg', null, {
      params: {
        channel: 'whatsapp',
        source: '917834811114', // Your Gupshup sandbox number
        destination: phoneNumber, // Customer number
        message: `🛍️ Thanks for your interest! 
Product: Retinol Night Cream
Qty: 1
Total: ₹499
Pay here: https://pay.test/ORD123

Reply to confirm your order. 😊`,
        'src.name': 'WhatsappCommerceOSv1'
      },
      headers: {
        apikey: GUPSHUP_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });


    console.log('Message API response:', response.data);
    res.json({ success: true, message: 'WhatsApp message sent!' });
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.message);
    res.status(500).json({ success: false, message: 'Failed to send WhatsApp message.' });
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
