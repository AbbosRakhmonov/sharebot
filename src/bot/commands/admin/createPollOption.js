const Poll = require("../../../models/poll");
const User = require("../../../models/user");
const { doneAndCancelKeyboard } = require("../../../utils/keyboards");
const createPollOption = async (ctx) => {
  try {
    const currentPollId = ctx.callbackQuery.data.split("_")[1];
    const poll = await Poll.findById(currentPollId).lean();

    if (!poll) {
      return await ctx.answerCbQuery("Сўровнома топилмади");
    }

    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      {
        step: "add-option",
        currentPollId,
      },
    ).lean();

    await ctx.reply("Сўровномани вариантини юборинг", {
      reply_markup: {
        keyboard: doneAndCancelKeyboard,
        resize_keyboard: true,
      },
    });
    await ctx.answerCbQuery();
  } catch (error) {
    console.error("Хатолик:", { error });
    await ctx.answerCbQuery("Хатолик. Кайтадан уриниб кўринг");
  }
};

module.exports = createPollOption;
