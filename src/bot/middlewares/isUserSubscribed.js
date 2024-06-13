const Channel = require("../../models/channel");

const checkIsUserSubscribedAllChannels = async (channels, ctx) => {
  const promises = channels.map((channel) =>
    ctx.telegram
      .getChatMember("@" + channel.username, ctx.from.id)
      .then((chatMember) => ({ chatMember, channel }))
      .catch((error) => ({ error, channel })),
  );
  const results = await Promise.all(promises);

  const unSubscribedChannels = results
    .filter(
      (result) =>
        !result.chatMember ||
        result.chatMember.status === "left" ||
        result.chatMember.status === "kicked",
    )
    .map((result) => result.channel.username);

  return unSubscribedChannels;
};

async function isUserSubscribed(ctx) {
  try {
    const channels = await Channel.find({
      username: { $nin: ctx.user?.channels || [] },
    }).lean();

    channels.push({ username: process.env.TRACKED_CHANNEL.split("@")[1] });

    const unSubscribedChannels = await checkIsUserSubscribedAllChannels(
      channels,
      ctx,
    );

    if (unSubscribedChannels.length === 0) {
      return false;
    }

    const channel = unSubscribedChannels[0];

    return channel;
  } catch (error) {
    throw new Error(error);
  }
}

module.exports = isUserSubscribed;
