const Markup = require("telegraf/markup");
const Poll = require("../../../models/poll");
const User = require("../../../models/user");

const deletePollOption = async (ctx) => {
  try {
    const pollId = ctx.callbackQuery.data.split("_")[1];
    const poll = await Poll.findById(pollId);

    if (!poll) {
      return await ctx.answerCbQuery("Сўровнома топилмади");
    }

    const optionIndex = parseInt(ctx.callbackQuery.data.split("_")[2]);

    poll.options.splice(optionIndex, 1);

    await poll.save();

    // delete all votes for this option in all users
    await User.updateMany(
      {
        votes: { $elemMatch: { pollId, optionIndex } },
      },
      {
        $pull: {
          votes: { pollId, optionIndex },
        },
      },
    );

    const newPoll = await Poll.findById(pollId).lean();

    const buttons = newPoll.options?.map((option, index) => [
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

    // edit current poll message
    await ctx.editMessageReplyMarkup({
      inline_keyboard: buttons,
    });
    await ctx.answerCbQuery("Вариант ўчирилди");
  } catch (error) {
    console.error("Хатолик:", { error });
    await ctx.answerCbQuery("Хатолик. Кайтадан уриниб кўринг");
  }
};

module.exports = deletePollOption;
