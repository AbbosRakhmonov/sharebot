const { Markup } = require("telegraf");
const Poll = require("../../../models/poll");
const { pollButtons } = require("../../../utils/keyboards");

const listPolls = async (ctx) => {
  try {
    const polls = await Poll.find({}).lean();

    if (polls.length === 0) {
      return await ctx.reply("Сўровномалар мавжуд эмас!");
    }

    // sennd pollList as inline button with publish button next to it and when user click on that button it will toggle active property when publish button is clicked it will publish the poll
    const buttons = polls.map((poll) => [
      [
        Markup.button.callback(
          `${poll.active ? "✅" : "❌"}-${poll.title}`,
          `toggle_${poll._id}`,
        ),
      ],
      pollButtons(poll),
    ]);

    // Flatten the buttons array for Telegraf
    const flattenedButtons = [].concat(...buttons);

    return await ctx.reply(`<b>Сўровномалар:</b>`, {
      reply_markup: {
        inline_keyboard: flattenedButtons,
        resize_keyboard: true,
      },
      parse_mode: "HTML",
    });
  } catch (error) {
    console.error("Хатолик:", { error });
    ctx.reply("Хатолик. Кайтадан уриниб кўринг");
  }
};

module.exports = listPolls;
