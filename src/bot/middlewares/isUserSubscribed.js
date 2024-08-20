const Channel = require("../../models/channel");
const {
  checkIsUserSubscribedAllChannels,
} = require("../../utils/checkIsUserSubscribedAllChannels");
const Markup = require("telegraf/markup");

async function isUserSubscribed(ctx, user) {
  try {
    const channels = await Channel.find({}).lean();

    channels.push({ username: process.env.TRACKED_CHANNEL.split("@")[1] });

    const unSubscribedChannels = await checkIsUserSubscribedAllChannels(
      channels,
      ctx
    );

    if (unSubscribedChannels.length !== 0) {
      const channel = unSubscribedChannels[0];
      user.channels = user.channels.filter((ch) => ch !== channel);
      await user.save();
      ctx.user = user;
      await ctx.deleteMessage();

      return ctx.reply(
        "❗️Илтимос, сўровномада иштирок этиш учун қуйидаги каналга аъзо бўлинг.",
        {
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.url(
                  "Каналга обуна бўлиш",
                  `https://t.me/${channel}`
                ),
              ],
              [
                Markup.button.callback(
                  "✅ Обуна бўлдим",
                  `subscribe_${channel}`
                ),
              ],
            ],
            resize_keyboard: true,
          },
        }
      );
    }
    return;
  } catch (error) {
    throw new Error(error);
  }
}

module.exports = isUserSubscribed;
