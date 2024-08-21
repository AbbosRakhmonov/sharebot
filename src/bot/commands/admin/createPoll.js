const User = require("../../../models/user");
const { doneAndCancelKeyboard } = require("../../../utils/keyboards");

const createPoll = async (ctx) => {
  try {
    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      {
        step: "create-poll-title",
        tempPollMessageId: null,
        pollOptions: [],
        tempPollTitle: "",
      },
    ).lean();

    return await ctx.reply("Сўровноманинг номини юборинг", {
      reply_markup: {
        keyboard: doneAndCancelKeyboard,
        resize_keyboard: true,
      },
    });
  } catch (error) {
    console.error("Хатолик:", {
      error,
    });
    ctx.reply("Хатолик. Кайтадан уриниб кўринг");
  }
};

module.exports = createPoll;
