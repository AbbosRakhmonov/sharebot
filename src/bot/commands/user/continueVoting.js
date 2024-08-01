const momentTimezone = require("moment-timezone");
const Markup = require("telegraf/markup");
const Poll = require("../../../models/poll");
const User = require("../../../models/user");

module.exports = async (ctx) => {
  try {
    if (!ctx.session || !ctx.session.captcha)
      return await ctx.reply(
        "Код эскирган! Илтимос, қайтдан овоз бериш тугмасини босинг.",
      );

    const captcha = ctx.session.captcha;
    const { message } = ctx.update;
    if (!message || message?.text?.trim() !== captcha)
      return await ctx.reply("Код нотўғри! Қайтадан уриниб кўринг.");

    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user.step.includes("captcha")) {
      return await ctx.reply("Сизга рухсат берилмаган");
    }

    const args = user.step.split("_").slice(1);
    const pollId = args[0];
    const optionIndex = parseInt(args[1]);

    const poll = await Poll.findById(pollId);

    const existingVote = user.votes.find((vote) => vote.pollId === pollId);
    let date = momentTimezone()
      .tz("Asia/Tashkent")
      .format("YYYY-MM-DD HH:mm:ss");
    if (existingVote) {
      if (existingVote.optionIndex !== optionIndex) {
        poll.options[existingVote.optionIndex].votes -= 1;
        user.votes = user.votes.map((vote) => {
          if (vote.pollId === pollId) {
            vote.optionIndex = optionIndex;
            vote.date = date;
          }
          return vote;
        });
        poll.options[optionIndex].votes += 1;
      } else {
        user.votes = user.votes.filter((vote) => vote.pollId !== pollId);
        poll.options[existingVote.optionIndex].votes -= 1;
      }
    } else {
      user.votes.push({ pollId, optionIndex, date });
      poll.options[optionIndex].votes += 1;
    }
    user.step = "";
    await user.save();
    await poll.save();
    ctx.session = undefined;
    let buttons = [];
    const newExistingVote = user.votes.find((vote) => vote.pollId === pollId);
    buttons = poll.options.map((option, index) => [
      Markup.button.callback(
        `(${option.votes}) ${option.text} ${
          newExistingVote && newExistingVote.optionIndex === index ? " ✅" : ""
        }`,
        `vote_${pollId}_${index}`,
      ),
    ]);
    // delete all previous messages
    await ctx.deleteMessage();

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
      await ctx.reply("Сизнинг овозингиз қабул қилинди!");
    } catch (error) {
      console.error("Хатолик:", { error });
      return await ctx.reply(
        "Эхтимол бу сўровнома тугаган, ёки каналга юборилмаган",
      );
    }

    // if messagsIdInChannel is not null, edit message in channel only buttons
    if (poll.messagsIdInChannel) {
      let channelButtons = poll.options.map((option, index) => [
        Markup.button.url(
          `(${option.votes}) ${option.text}`,
          `https://t.me/${ctx.botInfo.username}/?start=${pollId}_${index}`,
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
    }
  } catch (error) {
    console.error("Хатолик:", { error });
    await ctx.reply("Хатолик. Кайтадан уриниб кўринг");
  }
};
