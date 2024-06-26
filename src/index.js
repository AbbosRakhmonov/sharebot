const mongoose = require("mongoose");
require("dotenv").config();
const bot = require("./bot");
const logger = require("./utils/logger");
const express = require("express");
const bodyParser = require("body-parser");
const webhookUrl = `${process.env.WEBHOOK_URL}/api`;
const app = express();
const port = 3000;
// Middleware to parse JSON bodies
app.use(bodyParser.json());

let webhookSet = false;

const setWebhook = async () => {
  try {
    await bot.telegram.setWebhook(webhookUrl);
    webhookSet = true;
    logger.info("Webhook set successfully");
  } catch (err) {
    console.error("Failed to set webhook:", err);
  }
};

const start = async () => {
  try {
    // connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI).then(() => {
      console.log("Connected to MongoDB");
    });

    if (process.env.NODE_ENV === "production") {
      if (!webhookSet) {
        await setWebhook();
      }
    } else {
      await bot.telegram.deleteWebhook();
      bot.launch(() => console.log("Bot launched in development mode"));

      process.once("SIGINT", () => bot.stop("SIGINT"));
      process.once("SIGTERM", () => bot.stop("SIGTERM"));
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

app.post(`/`, async (req, res) => {
  try {
    res.status(200).json("Listening to bot events...");
  } catch (e) {
    res.status(500).send("Server Error");
    console.error(e.message);
  }
});

app.post(`/api`, async (req, res) => {
  try {
    await bot.handleUpdate(req.body, res);
    res.status(200).send("OK");
  } catch (e) {
    res.status(500).send("Server Error");
    console.error(e.message);
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

start();

// module.exports = async (req, res) => {
//   try {
//     if (req.method === "POST") {
//       await bot.handleUpdate(req.body, res);
//     } else {
//       // check are all good
//       res.status(200).json("Listening to bot events...");
//     }
//   } catch (error) {
//     console.error("Error handling update:", error);
//     res.status(500).json("Error");
//   }
// };
