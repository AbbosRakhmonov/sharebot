const { parentPort, workerData } = require("worker_threads");
const { Telegraf } = require("telegraf");
const bot = new Telegraf(process.env.BOT_TOKEN);
const { config } = require("dotenv");
config();
async function sendMessageToChunk({ chunks, ad, chatId }) {
  for (const user of chunks) {
    try {
      // check user alive
      const chatMember = await bot.telegram.getChatMember(
        process.env.TRACKED_CHANNEL,
        user._id,
      );

      console.log(chatMember);

      if (chatMember.status === "left" || chatMember.status === "kicked") {
        continue;
      }
      await bot.telegram.copyMessage(user._id, chatId, ad.messageId);
      await new Promise((resolve) => setTimeout(resolve, 50)); // 50ms delay to manage rate limits
    } catch (error) {
      console.log(error);
    }
  }
}

// promise-based worker
sendMessageToChunk(workerData)
  .then(() => parentPort.postMessage("Done"))
  .catch((error) => parentPort.postMessage(error.message));
