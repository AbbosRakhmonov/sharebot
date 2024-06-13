const { Markup } = require("telegraf");
const Poll = require("../../../models/poll");
const User = require("../../../models/user");

const saveTempPollOption = async (ctx) => {
  try {
    const user = await User.findOne({ telegramId: ctx.from.id }).lean();

    const currentPollOption = user.tempPollOption;

    if (!currentPollOption) {
      return await ctx.reply("Сўровномани вариантини юборинг");
    }

    const poll = await Poll.findById(user.currentPollId);

    if (!poll) {
      return await ctx.reply("Сўровнома топилмади");
    }

    poll.options.push({ text: currentPollOption, votes: 0 });

    await poll.save();

    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      { tempPollOption: "" },
    ).lean();

    const pollId = poll._id;

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
  } catch (error) {
    console.error("Хатолик:", { error });
    await ctx.reply("Хатолик. Кайтадан уриниб кўринг");
  }
};

module.exports = saveTempPollOption;
