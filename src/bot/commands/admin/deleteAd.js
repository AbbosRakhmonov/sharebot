const { Markup } = require("telegraf");
const Advert = require("../../../models/advert");
const { adButtons } = require("../../../utils/keyboards");

const deleteAd = async (ctx) => {
  try {
    const adId = ctx.callbackQuery.data.split("_")[1];
    const ad = await Advert.findById(adId);
    if (!ad) {
      return await ctx.answerCbQuery("Реклама топилмади", {
        show_alert: true,
      });
    }
    await Advert.findByIdAndDelete(adId);
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

    await ctx.editMessageReplyMarkup({
      inline_keyboard: flattenedButtons,
      resize_keyboard: true,
    });

    return await ctx.answerCbQuery(`${ad.title} номи реклама ўчирилди !`, {
      show_alert: true,
    });
  } catch (error) {
    console.error("Хатолик:", { error });
    await ctx.answerCbQuery("Хатолик. Кайтадан уриниб кўринг");
  }
};

module.exports = deleteAd;
