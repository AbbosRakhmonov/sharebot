const Channel = require("../../models/channel");
const {
  checkIsUserSubscribedAllChannels,
} = require("../../utils/checkIsUserSubscribedAllChannels");

async function isUserSubscribed(ctx) {
  try {
    const channels = await Channel.find({}).lean();

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
