const mongoose = require("mongoose");
require("dotenv").config({
  path: `.env.${process.env.NODE_ENV}`,
});
const bot = require("./bot");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const port = 3000;
const cron = require("node-cron");
const { cron1 } = require("./utils/cron");
const rateLimit = require("express-rate-limit");

app.set("trust proxy", 1);
// Middleware to parse JSON bodies
app.use(bodyParser.json());
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

app.get(`/`, async (req, res) => {
  try {
    res.status(200).send("OK");
  } catch (e) {
    res.status(500).send("Server Error");
    console.error(e.message);
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
});

const start = async () => {
  try {
    // connect to MongoDB
    await mongoose
      .connect(process.env.MONGODB_URI, {
        maxPoolSize: 10,
      })
      .then(() => {
        console.log("Connected to MongoDB");
      })
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });

    const botInfo = await bot.telegram.getMe();

    console.log(botInfo);

    if (process.env.NODE_ENV === "production") {
      app.use(
        await bot.createWebhook({
          domain: process.env.WEBHOOK_URL,
          path: "/api",
          drop_pending_updates: true,
        }),
      );
      console.log("Bot launched in production mode");
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

// cron jobs
cron.schedule("0 0 * * *", cron1);

// Handle uncaught exceptions and unhandled rejections
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

module.exports = app;
