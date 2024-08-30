const contact = require("../requiredContact");
const User = require("../../../models/user");

const checkUserSubscribtion = async (ctx, channel) => {
  try {
    const chatMember = await ctx.telegram.getChatMember(
      "@" + channel,
      ctx.from.id,
    );

    if (chatMember.status === "left" || chatMember.status === "kicked") {
      return true;
    }

    return false;
  } catch (error) {
    console.error("Хатолик:", { error });
    ctx.reply("Хатолик юз берди. Кайтадан уриниб кўринг");
  }
};

const subscribe = async (ctx) => {
  try {
    const channelsString = ctx.callbackQuery.data.split("_")[1];
    const channels = channelsString.split(",");
    const user = await User.findOne({ telegramId: ctx.from.id });

    if (!user) {
      return await contact(ctx);
    }

    const res = await Promise.all(
      channels.map(
        async (channel) => await checkUserSubscribtion(ctx, channel),
      ),
    );

    if (res.includes(true)) {
      return await ctx.answerCbQuery("Илтимос, каналга обуна бўлинг!", {
        show_alert: true,
      });
    }

    user.channels = [...new Set([...user.channels, ...channels])];

    await user.save();

    ctx.user = user;

    await ctx.deleteMessage();
    return await ctx.answerCbQuery(
      "Сиз каналга обуна бўлингиз, рахмат! Овоз беришда давом этишингиз мумкин.\n\n🔔 Эслатма: Агарда каналлардан чиқиб кетсангиз овозларингиз бекор қилинади!",
      { show_alert: true, cache_time: 1, is_personal: true },
    );
  } catch (error) {
    console.error("Хатолик:", { error });
    await ctx.answerCbQuery("Хатолик юз берди. Кайтадан уриниб кўринг");
  }
};

module.exports = subscribe;
