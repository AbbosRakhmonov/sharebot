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
      ctx,
    );

    if (unSubscribedChannels.length !== 0) {
      const { usernames: unSubscribedUsernames } = unSubscribedChannels.reduce(
        (acc, ch) => {
          acc.usernames.push(ch.username);
          return acc;
        },
        { usernames: [] },
      );
      user.channels = user.channels.filter(
        (ch) => !unSubscribedUsernames.includes(ch),
      );
      await user.save();
      ctx.user = user;
      ctx.deleteMessage();

      let buttons = unSubscribedUsernames.map((username) => {
        return [
          Markup.button.url(
            `Каналга обуна бўлиш ✅`,
            `https://t.me/${username}`,
          ),
        ];
      });

      return ctx.reply(
        `❗️Илтимос, сўровномада иштирок этиш учун қуйидаги каналларга обуна бўлинг !`,
        {
          reply_markup: {
            inline_keyboard: [
              ...buttons,
              [
                Markup.button.callback(
                  "🔄 Обуна бўлдим",
                  `subscribe_${unSubscribedUsernames.join(",")}`,
                ),
              ],
            ],
            resize_keyboard: true,
          },
          parse_mode: "HTML",
        },
      );
    }
    return;
  } catch (error) {
    console.error("Фойдаланувчини текширишда хатолик:", { error });
    ctx.reply(`Фойдаланувчини текширишда хатолик: ${error}`);
  }
}

module.exports = isUserSubscribed;
