const User = require("../../../models/user");
const addPollData = async (ctx, user) => {
  try {
    const { message, edited_message } = ctx.update;

    let tempPollMessageId = null;

    if (message) {
      tempPollMessageId = message.message_id;
    } else if (edited_message) {
      tempPollMessageId = edited_message.message_id;
    }

    if (!tempPollMessageId) {
      return await ctx.reply("Илтимос сўровномани узини юборинг");
    }

    return await User.findOneAndUpdate(
      { telegramId: user.telegramId },
      { tempPollMessageId },
    ).lean();
  } catch (error) {
    console.error("Хатолик:", { error });
    await ctx.reply("Хатолик. Кайтадан уриниб кўринг");
  }
};

module.exports = addPollData;
