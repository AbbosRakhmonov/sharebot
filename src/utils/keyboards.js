const { Markup } = require("telegraf");
const adminKeyboards = [
  ["Сўровнома яратиш", "Барча сўровномалар"],
  ["Каналлар", "Рекламалар"],
];
const userKeyboards = [["Овоз бериш"]];

const pollButtons = (poll) => [
  Markup.button.callback("👀", `see-poll_${poll._id}`),
  Markup.button.callback("🗑", `delete-poll_${poll._id}`),
  Markup.button.callback("🔗", `publish-poll_${poll._id}`),
];

const adButtons = (ad) => [
  Markup.button.callback("👀", `see-ad_${ad._id}`),
  Markup.button.callback("🗑", `delete-ad_${ad._id}`),
  Markup.button.callback("🔗", `publish-ad_${ad._id}`),
];

const channelButtons = (channel) => [
  Markup.button.url(channel.name, `https://t.me/${channel.username}`),
  Markup.button.callback("🗑", `delete-channel_${channel._id}`),
];

const doneAndCancelKeyboard = [
  [
    {
      text: "Done ✅",
    },
  ],
  [
    {
      text: "Cancel ❌",
    },
  ],
];

const doneAndCancelKeyboard2 = [
  Markup.button.text("Done ✅"),
  Markup.button.text("Cancel ❌"),
];

module.exports = {
  adminKeyboards,
  userKeyboards,
  pollButtons,
  doneAndCancelKeyboard,
  channelButtons,
  adButtons,
  doneAndCancelKeyboard2,
};
