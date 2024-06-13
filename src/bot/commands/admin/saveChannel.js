const Channel = require("../../../models/channel");
const User = require("../../../models/user");
const { channelButtons } = require("../../../utils/keyboards");
const { Markup } = require("telegraf");

const saveChannel = async (ctx) => {
  try {
    const { text } = ctx.update.message;

    let regex = /.*\B@(?=\w{5,32}\b)[a-zA-Z0-9]+(?:_[a-zA-Z0-9]+)*.*/;

    if (!text.trim().match(regex)) {
      return ctx.reply("Канал хаволасини тугри киритинг");
    }

    // Check if the channel exists and is bot admin
    let channel;
    try {
      channel = await ctx.telegram.getChat(text);
    } catch (err) {
      console.error(err);
      return ctx.reply("Канал топилмади");
    }

    const botMember = await ctx.telegram.getChatMember(text, ctx.botInfo.id);
    if (!["administrator", "creator"].includes(botMember.status)) {
      return ctx.reply("Бот каналда админ эмас");
    }

    await Channel.create({
      name: channel.title,
      chatId: channel.id,
      username: channel.username,
    });

    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      {
        step: "",
      },
    ).lean();

    // get all channels
    const channels = await Channel.find().lean();

    const buttons = channels.map(channelButtons);

    buttons.push([Markup.button.callback("➕ Add channel", `add-channel`)]);

    return await ctx.reply("Канал сақланди", {
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

module.exports = saveChannel;
