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

module.exports = {
  checkIsUserSubscribedAllChannels,
};
