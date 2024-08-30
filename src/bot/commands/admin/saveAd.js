const User = require("../../../models/user");
const { doneAndCancelKeyboard2 } = require("../../../utils/keyboards");
const { Markup } = require("telegraf");
const Advert = require("../../../models/advert");
const { adButtons, adminKeyboards } = require("../../../utils/keyboards");
const saveAd = async (ctx) => {
  try {
    const { tempAdTitle, tempAdContent } = ctx?.session || {};
    const user = await User.findOne({ telegramId: ctx.from.id });

    if (!tempAdTitle) {
      user.step = "add-ad-title";
      await user.save();
      return await ctx.reply("Илтимос реклама номини юборинг");
    }

    if (!tempAdContent) {
      user.step = "add-ad-content";
      await user.save();
      return await ctx.reply(
        `Реклама номи: <b><i>${tempAdTitle}</i></b>\n\nРеклама матнини юборинг`,
        {
          parse_mode: "HTML",
          ...Markup.keyboard(doneAndCancelKeyboard2).resize(),
        },
      );
    }

    user.step = "";

    await Promise.all([
      Advert.create({
        title: tempAdTitle,
        messageId: tempAdContent,
      }),
      user.save(),
    ]);

    ctx.user = user;
    delete ctx.session.tempAdTitle;
    delete ctx.session.tempAdContent;

    const ads = await Advert.find().lean();

    const buttons = ads.map((ad) => [
      [
        Markup.button.callback(
          `${ad.active ? "✅" : "❌"}-${ad.title}`,
          `change-ad-active_${ad._id}`,
        ),
      ],
      adButtons(ad),
    ]);

    buttons.push([[Markup.button.callback("➕ Реклама қўшиш", "add-ad")]]);

    const flattenedButtons = [].concat(...buttons);

    await ctx.reply("Реклама яратилди !", {
      reply_markup: {
        keyboard: adminKeyboards,
        resize_keyboard: true,
      },
    });
    return await ctx.reply(`<b>Рекламалар:</b>`, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: flattenedButtons,
        resize_keyboard: true,
      },
    });
  } catch (error) {
    console.error("Error:", { error });
    await ctx.reply(`Хатолик. Кайтадан уриниб кўринг ${JSON.stringify(error)}`);
  }
};

module.exports = saveAd;
