const Poll = require("../../../models/poll");
const User = require("../../../models/user");

const addPollOption = async (ctx, user) => {
  try {
    const currentPollId = user.currentPollId;

    const poll = await Poll.findById(currentPollId).lean();

    if (!poll) {
      return await ctx.reply("Сўровнома топилмади");
    }

    const { message, edited_message } = ctx.update;

    let pollOption = message?.text.trim() || edited_message?.text.trim();

    if (!pollOption) {
      return await ctx.reply("Сўровномани вариантини юборинг");
    }

    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      { tempPollOption: pollOption },
    ).lean();
  } catch (error) {
    console.error("Хатолик:", { error });
    await ctx.reply("Хатолик. Кайтадан уриниб кўринг");
  }
};

module.exports = addPollOption;
