const User = require("../../models/user");
module.exports = async (ctx, next) => {
  try {
    if (ctx.from) {
      let user = await User.findOne({ telegramId: ctx.from.id }).lean();
      if (user) {
        ctx.user = user;
      }
    }
    await next();
  } catch (error) {
    console.error("Хатолик:", error);
  }
};
