const Markup = require("telegraf/markup");
const contact = async (ctx) =>
  await ctx.reply(
    "Ботдан фойдаланиш учун пастдаги <b><i>☎️ Рақамни юбориш</i></b> тугмасини босинг 👇",
    {
      reply_markup: {
        keyboard: [[Markup.button.contactRequest("☎️ Рақамни юбориш")]],
        resize_keyboard: true,
      },
      parse_mode: "HTML",
    },
  );

module.exports = contact;
