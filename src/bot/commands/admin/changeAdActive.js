const Markup = require("telegraf/markup");
const Advert = require("../../../models/advert");
const { adButtons } = require("../../../utils/keyboards");

const changeAdActive = async (ctx) => {
  try {
    const adId = ctx.callbackQuery.data.split("_")[1];
    const ad = await Advert.findById(adId);
    if (!ad) {
      return await ctx.answerCbQuery("Реклама топилмади", {
        show_alert: true,
      });
    }
    ad.active = !ad.active;
    await ad.save();
    const ads = await Advert.find().lean();
    if (ads.length === 0) {
      return await ctx.answerCbQuery("Реклама топилмади", {
        show_alert: true,
      });
    }

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

    await ctx.editMessageReplyMarkup({
      inline_keyboard: flattenedButtons,
      resize_keyboard: true,
    });

    return await ctx.answerCbQuery(
      `Реклама активлиги ўзгартирилди: ${ad.active ? "✅" : "❌"}`,
    );
  } catch (error) {
    console.error("Хатолик:", { error });
    await ctx.answerCbQuery("Хатолик. Кайтадан уриниб кўринг");
  }
};

module.exports = changeAdActive;
