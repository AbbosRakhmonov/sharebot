const Markup = require("telegraf/markup");
const Poll = require("../../../models/poll");
const User = require("../../../models/user");

const listActivePolls = async (ctx) => {
  try {
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) {
      return await ctx.reply(
        "Сиз рўйхатдан ўтмагансиз. Илтимос, /start буйруғи билан боғланинг.",
      );
    }
    const polls = await Poll.find({ active: true }).select("title").lean();
    if (polls.length === 0) {
      return await ctx.reply("Сўровномалар мавжуд эмас!");
    }
    const buttons = polls.map((poll) => [
      Markup.button.callback(poll.title, `poll_${poll._id}`),
    ]);
    ctx.session = undefined;
    user.step = "";
    await user.save();
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
