const User = require("../../../models/user");

const addTempPollTitle = async (ctx) => {
  try {
    const { message, edited_message } = ctx.update;
    let tempPollTitle = message?.text?.trim() || edited_message?.text?.trim();

    if (!tempPollTitle) {
      return await ctx.reply("Илтимос сўровнома номини юборинг");
    }

    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      { tempPollTitle },
    ).lean();
  } catch (error) {
    console.error("Хатолик:", { error });
    await ctx.reply("Хатолик. Кайтадан уриниб кўринг");
  }
};

module.exports = addTempPollTitle;
