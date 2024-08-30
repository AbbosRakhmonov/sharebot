const { Markup } = require("telegraf");
const User = require("../../../models/user");
const { doneAndCancelKeyboard2 } = require("../../../utils/keyboards");

const addAd = async (ctx) => {
  try {
    await User.findOneAndUpdate(
      {
        telegramId: ctx.from.id,
      },
      {
        step: "add-ad-title",
      },
    );
    ctx.user.step = "add-ad-title";
    await ctx.answerCbQuery();
    return await ctx.reply("<b>Реклама сарлавҳасини киритинг !</b>", {
      parse_mode: "HTML",
      ...Markup.keyboard(doneAndCancelKeyboard2).resize(),
    });
  } catch (err) {
    ctx.reply("Хатолик юз берди");
    console.log(err);
  }
};

module.exports = addAd;
