const bot = require("../bot");
const User = require("../models/user");
const Poll = require("../models/poll");
const Channel = require("../models/channel");
const mongoose = require("mongoose");

// Cached environment variable
const trackedChannelUsername = process.env.TRACKED_CHANNEL.split("@")[1];

const checkIsUserSubscribedAllChannels = async (channels, bot, telegramId) => {
  const results = await Promise.all(
    channels.map(async (channel) =>
      await bot.telegram
        .getChatMember("@" + channel.username, telegramId)
        .then((chatMember) => ({
          status: chatMember.status,
          username: channel.username,
        }))
        .catch(() => ({ status: "error", username: channel.username })),
    ),
  );

  return results
    .filter(
      ({ status }) =>
        status === "left" || status === "kicked" || status === "error",
    )
    .map(({ username }) => username);
};

const cron1 = async () => {
  try {
    const users = await User.find({
      votes: { $exists: true, $not: { $size: 0 } },
    });

    if (users.length === 0) return;

    const channels = await Channel.find().lean();
    channels.push({ username: trackedChannelUsername });

    await Promise.all(
      users.map(async (user) => {
        const unSubscribedChannels = await checkIsUserSubscribedAllChannels(
          channels,
          bot,
          user.telegramId,
        );

        if (unSubscribedChannels.length === 0) return;

        user.channels = user.channels.filter(
          (channel) => !unSubscribedChannels.includes(channel),
        );

        const activePolls = await Poll.find({
          "options.votes": { $gt: 0 },
          active: true,
          _id: {
            $in: user.votes.map(
              (vote) => new mongoose.Types.ObjectId(vote.pollId),
            ),
          },
        });

        if (activePolls.length === 0) return;

        activePolls.forEach((poll) => {
          user.votes.forEach((vote) => {
            if (vote.pollId === poll._id.toString()) {
              poll.options[vote.optionIndex].votes -= 1;
            }
          });
        });

        user.votes = user.votes.filter(
          (vote) =>
            !activePolls
              .map((poll) => poll._id.toString())
              .includes(vote.pollId),
        );
        await Promise.all(activePolls.map(async (poll) => await poll.save()));
        await user.save();
        await bot.telegram.sendMessage(
          user.telegramId,
          `Каналлардан чиқиб кетганингиз учун,\n${activePolls
            .map((p) => `<b><i>${p.title}</i></b>\n`)
            .join(" ")}сўровнома${
            activePolls.length > 1 ? "лар" : ""
          } учун берган овозингиз бекор қилинди.`,
          {
            parse_mode: "HTML",
          },
        );
      }),
    );
  } catch (error) {
    console.error(error);
  } finally {
    console.log("Cron job executed");
  }
};

module.exports = { cron1 };
