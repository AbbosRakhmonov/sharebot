const Channel = require("../../../models/channel");
const { channelButtons } = require("../../../utils/keyboards");
const { Markup } = require("telegraf");

module.exports = async (ctx) => {
  try {
    const channels = await Channel.find().lean();

    const buttons = channels.map(channelButtons);

    buttons.push([Markup.button.callback("➕ Add channel", `add-channel`)]);

    let text = "Каналлар";

    if (!channels.length) {
      text += "\n\n<i>Каналлар топилмади</i>";
    }

    return await ctx.reply(text, {
      reply_markup: {
        inline_keyboard: buttons,
        resize_keyboard: true,
      },
      parse_mode: "HTML",
    });
  } catch (err) {
    console.error(err);
    ctx.reply("Хатолик юз берди");
  }
};
