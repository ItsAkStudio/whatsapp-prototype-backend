const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());

// Root route (for manual test)
app.get('/', (req, res) => {
  res.send('Backend is running!');
});

// Order handling route
app.post('/api/whatsapp/order', (req, res) => {
  console.log('Received Order Payload:', req.body);
  res.json({ message: 'Order received and being processed!' });
});

// Webhook route from Gupshup
app.post('/webhook', (req, res) => {
  console.log('Received webhook:', req.body);
  res.status(200).send('Webhook received');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
