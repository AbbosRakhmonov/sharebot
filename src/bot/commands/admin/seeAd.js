const Advert = require("../../../models/advert");

const seeAd = async (ctx) => {
  try {
    const adId = ctx.callbackQuery.data.split("_")[1];
    const ad = await Advert.findById(adId).lean();

    if (!ad) {
      return await ctx.answerCbQuery("Реклама топилмади", {
        show_alert: true,
        cache_time: 1,
        is_personal: true,
      });
    }

    // copy poll message
    await ctx.sendChatAction("typing");
    await ctx.answerCbQuery();
    console.log(ctx.chat.id);

    return await ctx.telegram.copyMessage(
      ctx.chat.id,
      ctx.chat.id,
      ad.messageId,
    );
  } catch (error) {
    console.error("Хатолик:", error);
    await ctx.reply("Хатолик. Кайтадан уриниб кўринг");
  }
};
module.exports = seeAd;
