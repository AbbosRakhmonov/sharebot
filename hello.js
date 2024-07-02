const axios = require('axios');
const async = require('async');

const BOT_TOKEN = '5707239501:AAGqBU1Hb1Ha1jjeAU94dCME2pzan2p8gB4';
const CHAT_ID = '923676873';
const MESSAGE = '/start';
const URL = `https://api.telegram.org/bot5707239501:AAGqBU1Hb1Ha1jjeAU94dCME2pzan2p8gB4/sendMessage`;

const sendMessage = async () => {
  try {
    const response = await axios.post(URL, {
      chat_id: CHAT_ID,
      text: MESSAGE,
    });
    console.log(response.data);
  } catch (error) {
    console.error(error.response ? error.response.data : error.message);
  }
};

const simulateRequests = (numRequests, concurrency) => {
  async.timesLimit(
    numRequests,
    concurrency,
    async (n, next) => {
      await sendMessage();
      next();
    },
    (err) => {
      if (err) console.error('Error during load test:', err);
      else console.log('Load test completed successfully');
    }
  );
};

const numRequests = 10000; // Total number of requests to simulate
const concurrency = 2000; // Number of concurrent requests

simulateRequests(numRequests, concurrency);
