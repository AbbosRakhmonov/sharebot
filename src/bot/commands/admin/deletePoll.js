const { Markup } = require("telegraf");
const Poll = require("../../../models/poll");
const User = require("../../../models/user");

const deletePoll = async (ctx) => {
  try {
    const pollId = ctx.callbackQuery.data.split("_")[1];
    await Poll.findByIdAndDelete(pollId).lean();
    await User.updateMany(
      { votes: { $elemMatch: { pollId } } },
      {
        $pull: {
          votes: { pollId },
        },
      },
    );
    const polls = await Poll.find({});
    if (polls.length === 0) {
      return await ctx.answerCbQuery("Сўровнома топилмади");
    }
    const buttons = polls.map((poll) => [
      [
        Markup.button.callback(
          `${poll.active ? "✅" : "❌"}-${poll.title}`,
          `toggle_${poll._id}`,
        ),
      ],
      [
        Markup.button.callback("👀", `see-poll_${poll._id}`),
        Markup.button.callback("🗑", `delete-poll_${poll._id}`),
        Markup.button.callback("🔗", `publish-poll_${poll._id}`),
      ],
    ]);
    // Flatten the buttons array for Telegraf
    const flattenedButtons = [].concat(...buttons);

    // reply without any words onyl inline button
    await ctx.editMessageReplyMarkup({
      inline_keyboard: flattenedButtons,
      resize_keyboard: true,
    });
    await ctx.answerCbQuery("Сўровнома ўчирилди");
  } catch (error) {
    console.error("Хатолик:", error);
    await ctx.answerCbQuery("Хатолик. Кайтадан уриниб кўринг");
  }
};

module.exports = deletePoll;
