const contact = require("../requiredContact");
const User = require("../../../models/user");
const isUserSubscribed = require("../../middlewares/isUserSubscribed");

const checkUserSubscribtion = async (ctx, channel) => {
  try {
    const chatMember = await ctx.telegram.getChatMember(
      "@" + channel,
      ctx.from.id
    );

    if (chatMember.status === "left" || chatMember.status === "kicked") {
      return true;
    }

    return false;
  } catch (error) {
    console.error("Хатолик:", { error });
    throw new Error(error);
  }
};

const subscribe = async (ctx, next) => {
  try {
    const channel = ctx.callbackQuery.data.split("_")[1];
    const user = await User.findOne({ telegramId: ctx.from.id });

    if (!user) {
      return await contact(ctx);
    }

    const isSubscribed = await checkUserSubscribtion(ctx, channel);

    if (isSubscribed) {
      return await ctx.answerCbQuery("Сиз каналга обуна бўлишингиз керак");
    }

    user.channels = [...user.channels, channel];

    await user.save();

    ctx.user = user;

    const res = await isUserSubscribed(ctx, user);
    if (res) {
      return;
    }

    await ctx.deleteMessage();
    await ctx.answerCbQuery(
      "Сиз каналга обуна бўлингиз, рахмат! Овоз беришда давом этишингиз мумкин."
    );
  } catch (error) {
    console.error("Хатолик:", { error });
    await ctx.answerCbQuery("Хатолик юз берди. Кайтадан уриниб кўринг");
  }
};

module.exports = subscribe;
