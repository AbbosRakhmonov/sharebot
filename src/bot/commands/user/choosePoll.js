const Markup = require("telegraf/markup");
const Poll = require("../../../models/poll");
const User = require("../../../models/user");
const contact = require("../requiredContact");

const choosePoll = async (ctx) => {
  try {
    const pollId = ctx.callbackQuery.data.split("_")[1];
    const poll = await Poll.findById(pollId).lean();
    if (!poll) {
      return await ctx.answerCbQuery("Сўровнома топилмади");
    }
    const user = await User.findOne({ telegramId: ctx.from.id });

    const existingVote = user?.votes?.find((vote) => vote.pollId === pollId);

    if (!user) {
      await ctx.answerCbQuery("Сиз рўйхатдан ўтмагансиз");
      return await contact(ctx);
    }

    let buttons = poll.options.map((option, index) => [
      Markup.button.callback(
        `(${option?.votes}) ${option.text} ${
          existingVote && existingVote.optionIndex === index ? " ✅" : ""
        }`,
        `vote_${pollId}_${index}`,
      ),
    ]);

    try {
      await ctx.telegram.copyMessage(
        ctx.chat.id,
        process.env.TRACKED_CHANNEL,
        poll.messagsIdInChannel,
        {
          reply_markup: {
            inline_keyboard: buttons,
          },
        },
      );
    } catch (error) {
      console.error("Хатолик:", { error });
      await ctx.reply("Эхтимол бу сўровнома тугаган, ёки каналга юборилмаган");
    } finally {
      await ctx.answerCbQuery();
    }
  } catch (error) {
    console.error("Хатолик:", { error });

    await ctx.answerCbQuery("Хатолик: " + error.message);
  }
};

module.exports = choosePoll;
