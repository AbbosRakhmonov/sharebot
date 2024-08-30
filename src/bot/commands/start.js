const User = require("../../models/user");
const Member = require("../../models/member");
const contact = require("./requiredContact");
const { userKeyboards, adminKeyboards } = require("../../utils/keyboards");
const start = async (ctx) => {
  try {
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) {
      if (ctx?.from?.id !== Number(process.env.ADMIN_CHAT_ID))
        await Member.updateOne(
          { _id: ctx?.message?.chat?.id },
          { $set: { _id: ctx?.message?.chat?.id } },
          { upsert: true },
        ).lean();
      return await contact(ctx);
    } else {
      if (ctx.from.id !== parseInt(process.env.ADMIN_CHAT_ID, 10)) {
        await ctx.reply(
          "<b>Ассалому Алайкум.</b>\nСўровнома ботга ҳуш келибсиз!",
          {
            reply_markup: {
              keyboard: userKeyboards,
              resize_keyboard: true,
            },
            parse_mode: "HTML",
          },
        );
      } else {
        await ctx.reply("<b>Ассалому Алайкум.</b>\nAdmin ботга ҳуш келибсиз", {
          reply_markup: {
            keyboard: adminKeyboards,
            resize_keyboard: true,
          },
          parse_mode: "HTML",
        });
      }
      user.step = "";
      user.tempPollTitle = "";
      user.tempPollOptions = [];
      user.tempPollMessageId = null;
      user.currentPollId = null;
      user.tempPollOption = "";
      return await user.save();
    }
  } catch (error) {
    console.error("Хатолик:", error);
    await ctx.reply("Хатолик. Кайтадан уриниб кўринг /start");
  }
};

module.exports = start;
