const User = require("../../models/user");
const contact = require("./requiredContact");
const { userKeyboards, adminKeyboards } = require("../../utils/keyboards");
const start = async (ctx) => {
  try {
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) {
      await contact(ctx);
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
      await user.save();
    }
  } catch (error) {
    console.error("Хатолик:", error);
    await ctx.reply("Хатолик. Кайтадан уриниб кўринг /start");
  }
};

module.exports = start;
