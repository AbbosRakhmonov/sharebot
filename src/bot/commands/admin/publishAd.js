const Advert = require("../../../models/advert");
const Member = require("../../../models/member");
const { Worker } = require("worker_threads");
const path = require("path");

const publishAd = async (ctx) => {
  try {
    const adId = ctx.callbackQuery.data.split("_")[1];
    const ad = await Advert.findById(adId).lean();
    if (!ad) {
      return await ctx.answerCbQuery("Реклама топилмади", {
        show_alert: true,
      });
    }
    const members = await Member.find().lean();
    const chunkSize = Math.ceil(members.length / 2);
    const chunks = [];
    for (let i = 0; i < members.length; i += chunkSize) {
      chunks.push(members.slice(i, i + chunkSize));
    }

    const workers = chunks.map((chunk) => {
      const workerData = { ad, chunks: chunk, chatId: ctx.chat.id };
      return new Promise((resolve, reject) => {
        const worker = new Worker(
          path.resolve(__dirname, "./sendMessageWorker.js"),
          {
            workerData,
          },
        );

        worker.on("message", async (message) => {
          if (message === "Done") {
            resolve();
          } else {
            await ctx.answerCbQuery("");
            await ctx.reply(`Хатолик: ${message}`);
            reject();
          }
        });

        worker.on("error", async (error) => {
          console.error("Хатолик:", { error });
          await ctx.answerCbQuery("Хатолик. Кайтадан уриниб кўринг");
          reject();
        });

        worker.on("exit", async (code) => {
          if (code !== 0) {
            console.error("Хатолик: Worker коди", code);
            await ctx.answerCbQuery("Хатолик. Кайтадан уриниб кўринг");
            reject();
          }
        });
      });
    });

    await ctx.answerCbQuery(
      "Реклама жўнатиш бошланди\n\nАгарда муваффақиятли жўнатилса, хабар бераман",
      {
        show_alert: true,
      },
    );
    await Promise.all(workers);
    return await ctx.reply("Реклама муваффақиятли жўнатилди");
  } catch (error) {
    console.error("Хатолик:", { error });
    await ctx.answerCbQuery("Хатолик. Кайтадан уриниб кўринг");
  }
};

module.exports = publishAd;
