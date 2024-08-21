const User = require("../../../models/user");
const { adminKeyboards } = require("../../../utils/keyboards");
const Poll = require("../../../models/poll");

const savePollData = async (ctx, user) => {
  try {
    const tempPollMessageId = user.tempPollMessageId;

    if (!tempPollMessageId) {
      return await ctx.reply("Илтимос сўровномани узини юборинг");
    }

    await User.findOneAndUpdate(
      { telegramId: user.telegramId },
      { step: "", tempPollMessageId: null, pollOptions: [] },
    ).lean();

    if (!user.tempPollTitle) {
      return await ctx.reply("/start бўйругини босинг");
    }

    await Poll.create({
      title: user.tempPollTitle,
      messagsId: tempPollMessageId,
      options: [],
    });

    return await ctx.reply("Сўровнома мўваффаккиятли яратилди", {
      reply_markup: {
        keyboard: adminKeyboards,
        resize_keyboard: true,
      },
    });
  } catch (error) {
    console.error("Хатолик:", {
      error,
    });
    await ctx.reply("Хатолик. Кайтадан уриниб кўринг");
  }
};

module.exports = savePollData;
