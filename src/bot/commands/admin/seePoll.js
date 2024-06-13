const Markup = require("telegraf/markup");
const Poll = require("../../../models/poll");

const seePoll = async (ctx) => {
  try {
    const pollId = ctx.callbackQuery.data.split("_")[1];
    const poll = await Poll.findById(pollId).lean();
    if (!poll) {
      return await ctx.answerCbQuery("Сўровнома топилмади");
    }

    // delete pollList message
    await ctx.deleteMessage();

    const buttons = poll.options?.map((option, index) => [
      Markup.button.callback(
        `(${option.votes}) ${option.text}`,
        `vote_${pollId}_${index}`,
      ),
      Markup.button.callback("❌", `delete-option_${pollId}_${index}`),
    ]);

    // add option button
    buttons.push([
      Markup.button.callback("➕ Add option", `add-option_${pollId}`),
    ]);

    // copy poll message
    await ctx.telegram.copyMessage(ctx.chat.id, ctx.chat.id, poll.messagsId, {
      reply_markup: {
        inline_keyboard: buttons,
      },
    });

    if (buttons.length === 0) {
      await ctx.answerCbQuery("Вариантлар мавжуд эмас");
    } else {
      await ctx.answerCbQuery();
    }
  } catch (error) {
    console.error("Хатолик:", error);
    await ctx.answerCbQuery("Хатолик. Кайтадан уриниб кўринг");
  }
};

module.exports = seePoll;
