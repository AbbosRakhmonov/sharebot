const contact = require("../requiredContact");
const Markup = require("telegraf/markup");
const Poll = require("../../../models/poll");
const User = require("../../../models/user");
const isUserSubscribed = require("../../middlewares/isUserSubscribed");
const checkPhoneNumber = require("../../../utils/checkPhoneNumber");
const { CaptchaGenerator } = require("captcha-canvas");

const votePoll = async (ctx) => {
  try {
    const args = ctx.callbackQuery.data.split("_").slice(1);
    const pollId = args[0];
    const optionIndex = parseInt(args[1]);

    if (!pollId || isNaN(optionIndex)) {
      return await ctx.answerCbQuery("Invalid arguments.");
    }

    const poll = await Poll.findById(pollId);

    if (!poll) {
      return await ctx.answerCbQuery("Сўровнома топилмади");
    }

    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      return await ctx.answerCbQuery("Invalid option index.");
    }

    if (!poll.active) {
      // delete all previous messages
      return await ctx.answerCbQuery("Сўровнома актив эмас");
    }

    const user = await User.findOne({ telegramId: ctx.from.id });

    if (!user) {
      return await contact(ctx);
    }

    if (checkPhoneNumber(user.phoneNumber)) {
      return await ctx.reply(
        "❗️Узур, ботдан <b></i>Ҳуманс</i></b> компанияси мижозлари фойдалана олишолмайди!",
        {
          reply_markup: {
            remove_keyboard: true,
          },
          parse_mode: "HTML",
        }
      );
    }

    const res = await isUserSubscribed(ctx, user);
    if (res) {
      return;
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
    user.step = `captcha_${pollId}_${optionIndex}`;
    await user.save();
    // reply with captcha with inline keyboard to refresh
    await ctx.replyWithPhoto(
      { source: buffer },
      {
        caption: "Тасвирдаги сўзни киритинг",
        reply_markup: {
          inline_keyboard: [
            [Markup.button.callback("🔄 Тасвирни янгилаш", `refresh_captcha`)],
          ],
        },
      }
    );
    await ctx.answerCbQuery();
  } catch (error) {
    console.error("Хатолик:", { error });
    await ctx.answerCbQuery("Хатолик. Кайтадан уриниб кўринг");
  }
};

module.exports = votePoll;
