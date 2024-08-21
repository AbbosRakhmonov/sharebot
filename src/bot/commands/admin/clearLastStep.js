const User = require("../../../models/user");
const { adminKeyboards } = require("../../../utils/keyboards");

const clearLastStep = async (ctx) => {
  try {
    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      {
        step: "",
        tempPollMessageId: null,
        tempPollOptions: [],
        tempPollTitle: "",
        currentPollId: null,
        tempPollOption: "",
      },
    ).lean();
    return await ctx.reply("Буйруқ бекор қилинди", {
      reply_markup: {
        keyboard: adminKeyboards,
        resize_keyboard: true,
      },
    });
  } catch (error) {
    console.error(error);
    ctx.reply("Хатолик. Кайтадан уриниб кўринг");
  }
};

module.exports = clearLastStep;
