module.exports = async (ctx, next) => {
  if (ctx?.message?.from?.is_bot || ctx?.update?.callback_query?.from?.is_bot) {
    return ctx.reply("Кечирасиз, БОТ сифатида фойдалана олмайсиз!");
  }
  await next();
};
