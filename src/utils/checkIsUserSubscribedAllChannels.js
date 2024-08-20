const checkIsUserSubscribedAllChannels = async (channels, ctx) => {
  const promises = channels.map(async (channel) => {
    try {
      const chatMember = await ctx.telegram.getChatMember("@" + channel.username, ctx.from.id);
      return { chatMember, channel };
    } catch (error) {
      return { error, channel };
    }
  });
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

module.exports = {
  checkIsUserSubscribedAllChannels,
};
