module.exports = async (ctx, next) => {
  try {
    if (ctx?.message?.from?.is_bot) {
      return ctx.reply("Кечирасиз, БОТ сифатида фойдалана олмайсиз!");
    }

    if (ctx?.update?.callback_query?.from?.is_bot) {
      return ctx.reply("Кечирасиз, БОТ сифатида фойдалана олмайсиз!");
    }

    await next();
  } catch (err) {
    console.log(err);
    throw new Error(err.message);
  }
};
