const Advert = require("../../../models/advert");
const { Markup } = require("telegraf");
const { adButtons } = require("../../../utils/keyboards");

const listAds = async (ctx) => {
  try {
    const ads = await Advert.find({}).lean();
    if (ads.length === 0) {
      return await ctx.reply("Рекламалар мавжуд эмас!", {
        reply_markup: {
          inline_keyboard: [
            [Markup.button.callback("➕ Реклама қўшиш", "add-ad")],
          ],
          resize_keyboard: true,
        },
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

    return await ctx.reply(`<b>Рекламалар:</b>`, {
      reply_markup: {
        inline_keyboard: flattenedButtons,
        resize_keyboard: true,
      },
      parse_mode: "HTML",
    });
  } catch (err) {
    ctx.reply("Хатолик. Кайтадан уриниб кўринг");
    console.log(err);
  }
};

module.exports = listAds;
