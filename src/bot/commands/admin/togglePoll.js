const Markup = require("telegraf/markup");
const Poll = require("../../../models/poll");
const { pollButtons } = require("../../../utils/keyboards");

const tooglePoll = async (ctx) => {
  try {
    const pollId = ctx.callbackQuery.data.split("_")[1];
    const poll = await Poll.findById(pollId);
    if (!poll) {
      return await ctx.answerCbQuery("Сўровнома топилмади");
    }
    poll.active = !poll.active;
    await poll.save();
    const polls = await Poll.find({}).lean();
    if (polls.length === 0) {
      return await ctx.answerCbQuery("Сўровнома топилмади");
    }

    const buttons = polls.map((poll) => [
      [
        Markup.button.callback(
          `${poll.active ? "✅" : "❌"}-${poll.title}`,
          `toggle_${poll._id}`,
        ),
      ],
      pollButtons(poll),
    ]);

    // Flatten the buttons array for Telegraf
    const flattenedButtons = [].concat(...buttons);

    // reply without any words onyl inline button
    await ctx.editMessageReplyMarkup({
      inline_keyboard: flattenedButtons,
      resize_keyboard: true,
    });
    return await ctx.answerCbQuery();
  } catch (error) {
    console.error("Хатолик:", { error });
    await ctx.answerCbQuery("Хатолик. Кайтадан уриниб кўринг");
  }
};

module.exports = tooglePoll;
