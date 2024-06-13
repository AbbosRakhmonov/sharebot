const logger = require("../../utils/logger");

async function isBotAdminInChannel(ctx, next) {
  try {
    const chatMember = await ctx.telegram.getChatMember(
      process.env.TRACKED_CHANNEL,
      ctx.botInfo.id,
    );
    if (!["administrator", "creator"].includes(chatMember.status)) {
      return await ctx.reply("Ботни каналда админ эмас !");
    }
    await next();
  } catch (error) {
    console.error("Ботни каналдаги ўрнини текширишда хатолик:", { error });
    ctx.reply(`Ботни каналдаги ўрнини текширишда хатолик: ${error}`);
  }
}

module.exports = isBotAdminInChannel;
