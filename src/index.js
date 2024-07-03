const mongoose = require("mongoose");
require("dotenv").config();
const bot = require("./bot");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const port = 3000;
// Middleware to parse JSON bodies
app.use(bodyParser.json());

const start = async () => {
  try {
    // connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI).then(() => {
      console.log("Connected to MongoDB");
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

app.get(`/`, async (req, res) => {
  try {
    res.status(200).send("OK");
  } catch (e) {
    res.status(500).send("Server Error");
    console.error(e.message);
  }
});

start();

app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

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
