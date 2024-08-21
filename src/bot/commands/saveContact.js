const User = require("../../models/user");
const { userKeyboards, adminKeyboards } = require("../../utils/keyboards");
const checkPhoneNumber = require("../../utils/checkPhoneNumber");
module.exports = async (ctx) => {
  try {
    const phoneNumber = ctx.message.contact.phone_number;
    const telegramId = ctx.message.contact.user_id;

    if (checkPhoneNumber(phoneNumber)) {
      return await ctx.reply(
        "❗️Узур, ботдан <b></i>Ҳуманс</i></b> компанияси мижозлари фойдалана олишолмайди!",
        {
          reply_markup: {
            remove_keyboard: true,
          },
          parse_mode: "HTML",
        },
      );
    }

    let user = await User.findOne({ telegramId });

    if (!user) {
      user = new User({ telegramId, phoneNumber, votes: [] });
    } else {
      user.phoneNumber = phoneNumber;
    }

    await user.save();

    if (ctx.from.id !== parseInt(process.env.ADMIN_CHAT_ID, 10)) {
      return await ctx.reply(
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
      return await ctx.reply(
        "<b>Ассалому Алайкум.</b>\nAdmin ботга ҳуш келибсиз!",
        {
          reply_markup: {
            keyboard: adminKeyboards,
            resize_keyboard: true,
          },
          parse_mode: "HTML",
        },
      );
    }
  } catch (error) {
    console.error("Хатолик:", { error });
    ctx.reply(`Хатолик. Кайтадан уриниб кўринг ${error}`);
  }
};
