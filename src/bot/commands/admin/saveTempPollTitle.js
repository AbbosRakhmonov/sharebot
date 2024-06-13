const User = require("../../../models/user");
const { doneAndCancelKeyboard } = require("../../../utils/keyboards");

const saveTempPollTitle = async (ctx) => {
  try {
    await User.findOneAndUpdate(
      {
        telegramId: ctx.from.id,
        step: "create-poll-title",
      },
      {
        step: "create-poll",
        tempPollMessageId: null,
        tempPollOptions: [],
      },
    );

    await ctx.reply("Сўровномани узини юборинг", {
      reply_markup: {
        keyboard: doneAndCancelKeyboard,
        resize_keyboard: true,
      },
    });
  } catch (error) {
    console.error("Хатолик:", { error });
    await ctx.reply("Хатолик. Кайтадан уриниб кўринг");
  }
};

module.exports = saveTempPollTitle;
