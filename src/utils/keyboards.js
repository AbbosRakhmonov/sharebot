const { Markup } = require("telegraf");
const adminKeyboards = [
  ["Сўровнома яратиш", "Барча сўровномалар"],
  ["Каналлар"],
];
const userKeyboards = [["Овоз бериш"]];

const pollButtons = (poll) => [
  Markup.button.callback("👀", `see-poll_${poll._id}`),
  Markup.button.callback("🗑", `delete-poll_${poll._id}`),
  Markup.button.callback("🔗", `publish-poll_${poll._id}`),
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

module.exports = {
  adminKeyboards,
  userKeyboards,
  pollButtons,
  doneAndCancelKeyboard,
  channelButtons,
};
