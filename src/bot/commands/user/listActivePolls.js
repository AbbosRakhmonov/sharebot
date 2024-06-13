const Markup = require("telegraf/markup");
const Poll = require("../../../models/poll");

const listActivePolls = async (ctx) => {
  try {
    const polls = await Poll.find({ active: true }).select("title").lean();
    if (polls.length === 0) {
      return await ctx.reply("Сўровномалар мавжуд эмас!");
    }
    const buttons = polls.map((poll) => [
      Markup.button.callback(poll.title, `poll_${poll._id}`),
    ]);
    return await ctx.reply(
      "Сўровномани танланг",
      Markup.inlineKeyboard(buttons).resize(),
    );
  } catch (error) {
    console.error("Хатолик:", { error });
    ctx.reply("Хатолик. Кайтадан уриниб кўринг");
  }
};

module.exports = listActivePolls;
