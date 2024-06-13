const User = require("../../../models/user");
const addChannel = async (ctx) => {
  try {
    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      {
        step: "add-channel",
      },
    ).lean();

    await ctx.reply(
      "Канал хаволасини куйидаги форматда киритинг: <i>@хавола</i>",
      {
        parse_mode: "HTML",
      },
    );
    await ctx.answerCbQuery();
  } catch (err) {
    console.error(err);
    ctx.answerCbQuery("Хатолик юз берди");
  }
};

module.exports = addChannel;
