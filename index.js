const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Backend is running!');
});

app.post('/api/whatsapp/order', (req, res) => {
  console.log('Received Order Payload:', req.body);
  res.json({ message: 'Order received and being processed!' });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
const express = require('express');
const app = express();

app.use(express.json());

app.post('/webhook', (req, res) => {
  console.log('Received webhook:', req.body);
  res.status(200).send('Webhook received');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
