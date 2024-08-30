const { doneAndCancelKeyboard2 } = require("../../../utils/keyboards");
const { Markup } = require("telegraf");
const User = require("../../../models/user");

const saveTempAdTitle = async (ctx) => {
  try {
    const { tempAdTitle } = ctx?.session || {};

    if (!tempAdTitle) {
      return await ctx.reply("Илтимос реклама номини юборинг");
    }

    const user = await User.findOne({ telegramId: ctx.from.id });
    user.step = "add-ad-content";
    await user.save();

    return await ctx.reply(
      `Реклама номи: <b><i>${tempAdTitle}</i></b>\n\nРеклама матнини юборинг`,
      {
        parse_mode: "HTML",
        ...Markup.keyboard(doneAndCancelKeyboard2).resize(),
      },
    );
  } catch (error) {
    console.error("Error:", { error });
    await ctx.reply("Хатолик. Кайтадан уриниб кўринг");
  }
};

module.exports = saveTempAdTitle;
