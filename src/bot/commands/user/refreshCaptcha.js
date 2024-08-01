const User = require("../../../models/user");
const Markup = require("telegraf/markup");
const { CaptchaGenerator } = require("captcha-canvas");
module.exports = async (ctx) => {
  try {
    // find user
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user.step.includes("captcha")) {
      return await ctx.answerCbQuery("Сизга рухсат берилмаган");
    }
    // captcha like blackboard
    const captcha = new CaptchaGenerator();
    captcha.setCaptcha({ color: "#000000", size: 50, font: "sans-serif" });
    captcha.setDimension(200, 400);
    captcha.setDecoy({ opacity: 0.5, total: 8 });
    captcha.setTrace({
      color: "#313131",
      opacity: 0.3,
      size: 2,
    });
    const buffer = await captcha.generate();
    ctx.session = { captcha: captcha.text };
    const args = user.step.split("_").slice(1);
    const pollId = args[0];
    const optionIndex = parseInt(args[1]);
    user.step = `captcha_${pollId}_${optionIndex}`;
    await user.save();
    // edit message only photo
    await ctx.editMessageMedia(
      {
        type: "photo",
        media: { source: buffer },
        caption: "Тасвирдаги сўзни киритинг",
      },
      {
        reply_markup: {
          inline_keyboard: [
            [Markup.button.callback("🔄 Тасвирни янгилаш", `refresh_captcha`)],
          ],
        },
      },
    );
    await ctx.answerCbQuery();
  } catch (error) {
    console.error("Хатолик:", { error });
    await ctx.answerCbQuery("Хатолик. Кайтадан уриниб кўринг");
  }
};
