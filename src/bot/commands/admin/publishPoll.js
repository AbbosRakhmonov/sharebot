const { Markup } = require("telegraf");
const Poll = require("../../../models/poll");

const publishPoll = async (ctx) => {
  try {
    const pollId = ctx.callbackQuery.data.split("_")[1];

    //  send poll to channel
    const poll = await Poll.findById(pollId);

    if (!poll) {
      return await ctx.answerCbQuery("Сўровнома топилмади");
    }

    if (!poll.active) {
      return await ctx.answerCbQuery("Сўровнома актив эмас");
    }

    const buttons = poll.options.map((option, index) => [
      Markup.button.url(
        `(${option.votes}) ${option.text}`,
        `https://t.me/${ctx.botInfo.username}?start=vote_${pollId}_${index}`,
      ),
    ]);

    const messsage = await ctx.telegram.copyMessage(
      process.env.TRACKED_CHANNEL,
      ctx.chat.id,
      poll.messagsId,
      {
        reply_markup: {
          inline_keyboard: buttons,
        },
      },
    );

    // save message id
    poll.messagsIdInChannel = messsage.message_id;
    await poll.save();

    await ctx.answerCbQuery("Сўровнома каналга юборилди");
  } catch (error) {
    console.error("Хатолик:", { error });
    await ctx.answerCbQuery("Хатолик. Кайтадан уриниб кўринг");
  }
};

module.exports = publishPoll;
