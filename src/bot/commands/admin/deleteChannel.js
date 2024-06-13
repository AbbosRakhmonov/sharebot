const Channel = require("../../../models/channel");
const User = require("../../../models/user");
const { channelButtons } = require("../../../utils/keyboards");
const { Markup } = require("telegraf");

const deleteChannel = async (ctx) => {
  try {
    const text = ctx.callbackQuery.data.split("_")[1];

    if (!text.trim()) {
      return await ctx.answerCbQuery("Канал топилмади");
    }

    await Channel.findByIdAndDelete(text).lean();

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

    await ctx.answerCbQuery();
    return await ctx.editMessageText("Канал ўчирилди", {
      reply_markup: {
        inline_keyboard: buttons,
        resize_keyboard: true,
      },
      parse_mode: "HTML",
    });
  } catch (err) {
    console.error(err);
    ctx.answerCbQuery("Хатолик юз берди");
  }
};

module.exports = deleteChannel;
