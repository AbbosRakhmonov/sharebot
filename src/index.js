const mongoose = require("mongoose");
require("dotenv").config();
const bot = require("./bot");
const logger = require("./utils/logger");
const webhookUrl = `${process.env.WEBHOOK_URL}/api`;
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
      bot.launch(() => console.log("Bot launched in development mode"));

      process.once("SIGINT", () => bot.stop("SIGINT"));
      process.once("SIGTERM", () => bot.stop("SIGTERM"));
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();

module.exports = async (req, res) => {
  try {
    if (req.method === "POST") {
      await bot.handleUpdate(req.body, res);
    } else {
      // check are all good
      res.status(200).json("Listening to bot events...");
    }
  } catch (error) {
    console.error("Error handling update:", error);
    res.status(500).json("Error");
  }
};
