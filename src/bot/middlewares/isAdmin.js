const checkIsAdmin = async (ctx, next) => {
  if (ctx.from.id !== parseInt(process.env.ADMIN_CHAT_ID, 10)) {
    await ctx.answerCbQuery();
    await ctx.deleteMessage();
    return await ctx.reply(
      "Сиз ушбу буйруқдан фойдаланиш ҳуқуқига эга эмассиз.",
    );
  }
  await next();
};

module.exports = checkIsAdmin;
