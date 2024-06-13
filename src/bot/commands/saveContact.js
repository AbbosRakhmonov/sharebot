const User = require("../../models/user");
const logger = require("../../utils/logger");
const { userKeyboards, adminKeyboards } = require("../../utils/keyboards");
module.exports = async (ctx) => {
  try {
    const phoneNumber = ctx.message.contact.phone_number;
    const telegramId = ctx.message.contact.user_id;

    let user = await User.findOne({ telegramId });

    if (!user) {
      user = new User({ telegramId, phoneNumber, votes: [] });
    } else {
      user.phoneNumber = phoneNumber;
    }

    await user.save();

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
      await ctx.reply("<b>Ассалому Алайкум.</b>\nAdmin ботга ҳуш келибсиз!", {
        reply_markup: {
          keyboard: adminKeyboards,
          resize_keyboard: true,
        },
        parse_mode: "HTML",
      });
    }
  } catch (error) {
    console.log(error);
    console.error("Хатолик:", { error });
    ctx.reply(`Хатолик. Кайтадан уриниб кўринг ${error}`);
  }
};
