const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

const bot = require('../src');
const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

app.post(`/api`, async (req, res) => {
  try {
    await bot(req, res);
    res.status(200).send('OK');
  } catch (e) {
    res.status(500).send('Server Error');
    console.error(e.message);
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
