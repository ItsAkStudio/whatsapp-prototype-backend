const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// Replace with your actual Gupshup API Key
const GUPSHUP_API_KEY = 'sk_a339e57ceb834ef3ad5e7d2c6dbda214';

// Middleware
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.send('Backend is running!');
});

// Order endpoint
app.post('/api/whatsapp/order', async (req, res) => {
  try {
    const { phoneNumber, name, orderDetails } = req.body;

    const message = `🛒 Hello ${name}, thanks for your order! We’ll get it to you soon.`;

    const response = await axios.post('https://api.gupshup.io/sm/api/v1/msg', null, {
      params: {
        channel: 'whatsapp',
        source: '917834811114', // From Gupshup App
        destination: phoneNumber,
        message: message,
        src.name: 'WhatsappCommerceOSv1',
      },
      headers: {
        'apikey': GUPSHUP_API_KEY,
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

// Webhook endpoint (optional, for delivery/read receipts)
app.post('/webhook', (req, res) => {
  console.log('Received webhook:', req.body);
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
