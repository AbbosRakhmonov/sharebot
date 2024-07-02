const contact = require("../requiredContact");
const Markup = require("telegraf/markup");
const Poll = require("../../../models/poll");
const User = require("../../../models/user");

const votePoll = async (ctx) => {
  try {
    const args = ctx.callbackQuery.data.split("_").slice(1);
    const pollId = args[0];
    const optionIndex = parseInt(args[1]);

    if (!pollId || isNaN(optionIndex)) {
      return await ctx.answerCbQuery("Invalid arguments.");
    }

    const poll = await Poll.findById(pollId);

    if (!poll) {
      return await ctx.answerCbQuery("Сўровнома топилмади");
    }

    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      return await ctx.answerCbQuery("Invalid option index.");
    }

    if (!poll.active) {
      // delete all previous messages
      return await ctx.answerCbQuery("Сўровнома актив эмас");
    }

    const user = await User.findOne({ telegramId: ctx.from.id });

    if (!user) {
      return await contact(ctx);
    }

    const existingVote = user.votes.find((vote) => vote.pollId === pollId);

    if (existingVote) {
      if (existingVote.optionIndex !== optionIndex) {
        poll.options[existingVote.optionIndex].votes -= 1;
        user.votes = user.votes.map((vote) => {
          if (vote.pollId === pollId) {
            vote.optionIndex = optionIndex;
          }
          return vote;
        });
        poll.options[optionIndex].votes += 1;
      } else {
        user.votes = user.votes.filter((vote) => vote.pollId !== pollId);
        poll.options[existingVote.optionIndex].votes -= 1;
      }
    } else {
      user.votes.push({ pollId, optionIndex });
      poll.options[optionIndex].votes += 1;
    }

    await user.save();

    await poll.save();

    let buttons = [];

    buttons = poll.options.map((option, index) => [
      Markup.button.callback(
        `(${option.votes}) ${option.text}`,
        `vote_${pollId}_${index}`,
      ),
      Markup.button.callback("❌", `delete-option_${pollId}_${index}`),
    ]);

    buttons.push([
      Markup.button.callback("➕ Add option", `add-option_${pollId}`),
    ]);

    // edit current poll message
    await ctx.editMessageReplyMarkup({
      inline_keyboard: buttons,
    });

    // if messagsIdInChannel is not null, edit message in channel only buttons
    if (poll.messagsIdInChannel) {
      let channelButtons = poll.options.map((option, index) => [
        Markup.button.url(
          `(${option.votes}) ${option.text}`,
          `https://t.me/${
            ctx.botInfo.username
          }/?start=${pollId}_${index}`,
        ),
      ]);

      await ctx.telegram.editMessageReplyMarkup(
        process.env.TRACKED_CHANNEL,
        poll.messagsIdInChannel,
        null,
        {
          inline_keyboard: channelButtons,
        },
      );
      await ctx.answerCbQuery();
    }
  } catch (error) {
    console.error("Хатолик:", error);
    await ctx.answerCbQuery("Хатолик. Кайтадан уриниб кўринг");
  }
};

module.exports = votePoll;
