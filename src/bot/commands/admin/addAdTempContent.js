const User = require("../../../models/user");
const addAdTempContent = async (ctx) => {
  try {
    const { tempAdTitle } = ctx?.session || {};
    if (!tempAdTitle) {
      const user = await User.findOne({ telegramId: ctx.from.id });
      user.step = "add-ad-title";
      await user.save();
      return await ctx.reply("Илтимос реклама номини юборинг");
    }
    const { message, edited_message } = ctx.update;
    const content = message || edited_message;
    const { message_id } = content;
    ctx.session = ctx.session || {};
    ctx.session.tempAdTitle = tempAdTitle;
    ctx.session.tempAdContent = message_id;
  } catch (error) {
    console.error("Error:", { error });
    await ctx.reply("Хатолик. Кайтадан уриниб кўринг");
  }
};

module.exports = addAdTempContent;
