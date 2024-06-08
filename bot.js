require("dotenv").config();
const { Telegraf, Markup, session } = require("telegraf");
const mongoose = require("mongoose");
const Poll = require("./models/poll");
const User = require("./models/user");
const logger = require("./logger");

mongoose.connect(process.env.MONGODB_URI).then(() => {
  logger.info("Connected to MongoDB");
}).catch((err) => {
  logger.error("Failed to connect to MongoDB:", err);
});

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  logger.info(`${ctx.from.first_name} - Update type: ${ctx.updateType}, response time: ${ms}ms`);
});

bot.use(session());

// if production use webhook else polling
// Set webhook URL
if (process.env.NODE_ENV === "production") {
  const webhookUrl = `${process.env.WEBHOOK_URL}/api`;

  let webhookSet = false;

  const setWebhook = async () => {
    try {
      await bot.telegram.setWebhook(webhookUrl);
      webhookSet = true;
      logger.info("Webhook set successfully");
    } catch (err) {
      logger.error("Failed to set webhook:", err);
    }
  };

  if (!webhookSet) {
    setWebhook();
  }

  module.exports = async (req, res) => {
    try {
      if (req.method === 'POST') {
        await bot.handleUpdate(req.body, res);
      } else {
        // check are all good
        res.status(200).json('Listening to bot events...');
      }
    } catch (error) {
      console.error("Error handling update:", error);
      res.status(500).json('Error');
    }
  };
} else {
  bot.telegram.deleteWebhook();

  bot.launch()
    .then(() => console.log("Bot launched in development mode"))
    .catch(err => console.error("Failed to launch bot:", err));

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
const adminKeyboards = [["Сўровнома яратиш", "Барча сўровномалар"]];
const userKeyboards = [["Овоз бериш"]];

const checkIsAdmin = async (ctx, next) => {
  if (ctx.from.id !== parseInt(process.env.ADMIN_CHAT_ID, 10)) {
    return await ctx.reply("Сиз ушбу буйруқдан фойдаланиш ҳуқуқига эга эмассиз.");
  }
  await next();
};

// Utility function to check if a user is subscribed to required channels
async function isUserSubscribed(ctx) {
  try {
    const chatMember = await ctx.telegram.getChatMember(process.env.TRACKED_CHANNEL, ctx.from.id);
    return !(chatMember.status === "left" || chatMember.status === "kicked");
  } catch (error) {
    logger.error("Фойдаланувчи обунасини текширишда хатолик юз берди:", { error });
    return false;
  }
}

async function isBotAdminInChannel(ctx, next) {
  try {
    const chatMember = await ctx.telegram.getChatMember(process.env.TRACKED_CHANNEL, ctx.botInfo.id);
    if (!["administrator", "creator"].includes(chatMember.status)) {
      return await ctx.reply("Ботни каналда админ эмас !");
    }
    await next();
  } catch (error) {
    logger.error('Ботни каналдаги ўрнини текширишда хатолик:', { error });
    await ctx.reply(`Ботни каналдаги ўрнини текширишда хатолик: ${error}`);
  }
}
// Request contact info
bot.command("start", async (ctx) => {
  try {
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) {
      await ctx.reply(
        "Ботдан фойдаланиш учун пастдаги <b><i>☎️ Рақамни юбориш</i></b> тугмасини босинг 👇",
        {
          reply_markup: {
            keyboard: [[Markup.button.contactRequest("☎️ Рақамни юбориш")]],
            resize_keyboard: true,
          },
          parse_mode: "HTML",
        },
      );
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
    logger.error('Хатолик:', { error });
    await ctx.reply("Хатолик. Кайтадан уриниб кўринг /start");
  }
});

bot.on("contact", async (ctx) => {
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
            keyboard: [["Vote"]],
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
    logger.error('Хатолик:', { error });
    await ctx.reply(`Хатолик. Кайтадан уриниб кўринг ${error}`);
  }
});

bot.catch((err, ctx) => {
  console.error(`Ботда ноодатий хатолик юз берди ${ctx.updateType}`, err);
  ctx.reply("Ботда ноодатий хатолик юз берди, кайтадан уриниб кўринг");
  process.exit();
});

const voteToPoll = async (ctx) => {
  try {
    const polls = await Poll.find({ active: true }).select("title").lean();
    if (polls.length === 0) {
      return await ctx.reply("Сўровномалар мавжуд эмас!");
    }
    const buttons = polls.map((poll) => [
      Markup.button.callback(poll.title, `poll_${poll._id}`),
    ]);
    ctx.reply(
      "Сўровномани танланг",
      Markup.inlineKeyboard(buttons).resize(),
    );
  } catch (error) {
    logger.error('Хатолик:', { error });
    ctx.reply("Хатолик. Кайтадан уриниб кўринг");
  }

};

const listPolls = async (ctx) => {
  const polls = await Poll.find({}).lean();
  if (polls.length === 0) {
    return ctx.reply("Сўровномалар мавжуд эмас!");
  }

  // sennd pollList as inline button with publish button next to it and when user click on that button it will toggle active property when publish button is clicked it will publish the poll
  const buttons = polls.map((poll) => [
    [
      Markup.button.callback(
        `${poll.active ? "✅" : "❌"}-${poll.title}`,
        `toggle_${poll._id}`,
      ),
    ],
    [
      Markup.button.callback("👀", `see-poll_${poll._id}`),
      Markup.button.callback("🗑", `delete-poll_${poll._id}`),
      Markup.button.callback("🔗", `publish-poll_${poll._id}`),
    ],
  ]);

  // Flatten the buttons array for Telegraf
  const flattenedButtons = [].concat(...buttons);

  await ctx.reply(`<b>Сўровномалар:</b>`, {
    reply_markup: {
      inline_keyboard: flattenedButtons,
      resize_keyboard: true,
    },
    parse_mode: "HTML",
  });
};

const createPoll = async (ctx) => {
  // wait until click done button
  await User.findOneAndUpdate(
    { telegramId: ctx.from.id },
    {
      step: "create-poll-title",
      tempPollMessageId: null,
      pollOptions: [],
      tempPollTitle: "",
    },
  ).lean();

  await ctx.reply("Сўровноманинг номини юборинг", {
    reply_markup: {
      keyboard: [
        [
          {
            text: "Done ✅",
          },
        ],
        [
          {
            text: "Cancel ❌",
          },
        ],
      ],
      resize_keyboard: true,
    },
  });
};

const clearLastPoll = async (ctx) => {
  await User.findOneAndUpdate(
    { telegramId: ctx.from.id },
    {
      step: "",
      tempPollMessageId: null,
      tempPollOptions: [],
      tempPollTitle: "",
      currentPollId: null,
      tempPollOption: "",
    },
  ).lean();
  await ctx.reply("Буйруқ бекор қилинди", {
    reply_markup: {
      keyboard: adminKeyboards,
      resize_keyboard: true,
    },
  });
};

const cancelCommand = async (ctx) => {
  return await clearLastPoll(ctx);
  // const user = await User.findOne({ telegramId: ctx.from.id })
  //   .select("step")
  //   .lean();

  // switch (user.step) {
  //   case "create-poll-title":
  //     await clearLastPoll(ctx);
  //     break;
  //   case "create-poll":
  //     await clearLastPoll(ctx);
  //     break;
  //   case "add-option":
  //     await clearLastPoll(ctx);
  //     break;
  //   default:
  //     return;
  // }
};

const addTempPollTitle = async (ctx) => {
  try {
    const { message, edited_message } = ctx.update;
    let tempPollTitle = message?.text?.trim() || edited_message?.text?.trim();

    if (!tempPollTitle) {
      return await ctx.reply("Илтимос сўровнома номини юборинг");
    }

    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      { tempPollTitle },
    ).lean();
  } catch (error) {
    logger.error('Хатолик:', { error });
    await ctx.reply("Хатолик. Кайтадан уриниб кўринг");
  }
};

const saveTempPollTitle = async (ctx) => {
  try {
    await User.findOneAndUpdate(
      {
        telegramId: ctx.from.id,
        step: "create-poll-title",
      },
      {
        step: "create-poll",
        tempPollMessageId: null,
        tempPollOptions: [],
      },
    );

    await ctx.reply("Сўровномани узини юборинг", {
      reply_markup: {
        keyboard: [
          [
            {
              text: "Done ✅",
            },
          ],
          [
            {
              text: "Cancel ❌",
            },
          ],
        ],
        resize_keyboard: true,
      },
    });
  } catch (error) {
    logger.error('Хатолик:', { error });
    await ctx.reply("Хатолик. Кайтадан уриниб кўринг");
  }
};

const addPollData = async (ctx, user) => {
  try {
    const { message, edited_message } = ctx.update;

    let tempPollMessageId = null;

    if (message) {
      tempPollMessageId = message.message_id;
    } else if (edited_message) {
      tempPollMessageId = edited_message.message_id;
    }

    if (!tempPollMessageId) {
      return await ctx.reply("Илтимос сўровномани узини юборинг");
    }

    await User.findOneAndUpdate(
      { telegramId: user.telegramId },
      { tempPollMessageId },
    ).lean();
  } catch (error) {
    logger.error('Хатолик:', { error });
    await ctx.reply("Хатолик. Кайтадан уриниб кўринг");
  }
};

const savePollData = async (ctx, user) => {
  // check the message still exist
  const tempPollMessageId = user.tempPollMessageId;
  if (!tempPollMessageId) {
    return await ctx.reply("Илтимос сўровномани узини юборинг");
  }

  try {
    await User.findOneAndUpdate(
      { telegramId: user.telegramId },
      { step: "", tempPollMessageId: null, pollOptions: [] },
    ).lean();

    if (!user.tempPollTitle) {
      return await ctx.reply("/start бўйругини босинг");
    }

    await Poll.create({
      title: user.tempPollTitle,
      messagsId: tempPollMessageId,
      options: [],
    });

    await ctx.reply("Сўровнома мўваффаккиятли яратилди", {
      reply_markup: {
        keyboard: adminKeyboards,
        resize_keyboard: true,
      },
    });
  } catch (error) {
    logger.error('Хатолик:', { error });
    await ctx.reply("Хатолик. Кайтадан уриниб кўринг");
  }
};

const createPollOption = async (ctx, next) => {
  try {
    const currentPollId = ctx.callbackQuery.data.split("_")[1];
    const poll = await Poll.findById(currentPollId).lean();

    if (!poll) {
      return await ctx.reply("Сўровнома топилмади");
    }

    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      {
        step: "add-option",
        currentPollId,
      },
    ).lean();

    await ctx.reply("Сўровномани вариантини юборинг", {
      reply_markup: {
        keyboard: [
          [
            {
              text: "Done ✅",
            },
          ],
          [
            {
              text: "Cancel ❌",
            },
          ],
        ],
        resize_keyboard: true,
      },
    });
  } catch (error) {
    logger.error('Хатолик:', { error });
    await ctx.reply("Хатолик. Кайтадан уриниб кўринг");
  }
};

const addPollOption = async (ctx, user) => {
  try {
    const currentPollId = user.currentPollId;

    const poll = await Poll.findById(currentPollId).lean();

    if (!poll) {
      return await ctx.reply("Сўровнома топилмади");
    }

    const { message, edited_message } = ctx.update;

    let pollOption = message?.text.trim() || edited_message?.text.trim();

    if (!pollOption) {
      return await ctx.reply("Сўровномани вариантини юборинг");
    }

    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      { tempPollOption: pollOption },
    ).lean();
  } catch (error) {
    logger.error('Хатолик:', { error });
    await ctx.reply("Хатолик. Кайтадан уриниб кўринг");
  }
};

const saveTempPollOption = async (ctx) => {
  try {
    const user = await User.findOne({ telegramId: ctx.from.id }).lean();

    const currentPollOption = user.tempPollOption;

    if (!currentPollOption) {
      return await ctx.reply("Сўровномани вариантини юборинг");
    }

    const poll = await Poll.findById(user.currentPollId);

    if (!poll) {
      return await ctx.reply("Сўровнома топилмади");
    }

    poll.options.push({ text: currentPollOption, votes: 0 });

    await poll.save();

    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      { tempPollOption: "" },
    ).lean();

    const pollId = poll._id;

    const buttons = poll.options?.map((option, index) => [
      Markup.button.callback(
        `(${option.votes}) ${option.text}`,
        `vote_${pollId}_${index}`,
      ),
    ]);

    // add option button
    buttons.push([
      Markup.button.callback("➕ Add option", `add-option_${pollId}`),
    ]);

    // copy poll message
    await ctx.telegram.copyMessage(ctx.chat.id, ctx.chat.id, poll.messagsId, {
      reply_markup: {
        inline_keyboard: buttons,
      },
    });
  } catch (error) {
    logger.error('Хатолик:', { error });
    await ctx.reply("Хатолик. Кайтадан уриниб кўринг");
  }
};

const deletePollOption = async (ctx, next) => {
  try {
    const pollId = ctx.callbackQuery.data.split("_")[1];
    const poll = await Poll.findById(pollId);

    if (!poll) {
      return await ctx.reply("Сўровнома топилмади");
    }

    const optionIndex = parseInt(ctx.callbackQuery.data.split("_")[2]);

    poll.options.splice(optionIndex, 1);

    await poll.save();

    // delete all votes for this option in all users
    await User.updateMany(
      {
        votes: { $elemMatch: { pollId, optionIndex } },
      },
      {
        $pull: {
          votes: { pollId, optionIndex },
        },
      },
    );

    const newPoll = await Poll.findById(pollId).lean();

    const buttons = newPoll.options?.map((option, index) => [
      Markup.button.callback(
        `(${option.votes}) ${option.text}`,
        `vote_${pollId}_${index}`,
      ),
      Markup.button.callback("❌", `delete-option_${pollId}_${index}`),
    ]);

    // add option button
    buttons.push([
      Markup.button.callback("➕ Add option", `add-option_${pollId}`),
    ]);

    // edit current poll message
    await ctx.editMessageReplyMarkup({
      inline_keyboard: buttons,
    });
  } catch (error) {
    logger.error('Хатолик:', { error });
    await ctx.reply("Хатолик. Кайтадан уриниб кўринг");
  }
};

const doneCommand = async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id }).lean();

  switch (user.step) {
    case "create-poll-title":
      await saveTempPollTitle(ctx);
      break;
    case "create-poll":
      await savePollData(ctx, user);
      break;
    case "add-option":
      await saveTempPollOption(ctx);
      break;
    default:
      break;
  }
};

// catch Vote command
bot.on("text", async (ctx, next) => {
  let message = ctx.message.text.trim();

  switch (message) {
    case "Овоз бериш":
      await voteToPoll(ctx);
      break;
    case "Барча сўровномалар":
      await checkIsAdmin(ctx, next);
      await listPolls(ctx);
      break;
    case "Сўровнома яратиш":
      await checkIsAdmin(ctx, next);
      await createPoll(ctx);
      break;
    case "Cancel ❌":
      await cancelCommand(ctx);
      break;
    case "Done ✅":
      await doneCommand(ctx);
      break;
    default:
      await next();
      break;
  }

  // const user = await User.findOne({ telegramId: ctx.from.id });

  // if (!user) {
  //   return await ctx.reply(
  //     "Please share your contact number to proceed.",
  //     Markup.keyboard([Markup.button.contactRequest("☎️ Рақамни юбориш")])
  //       .oneTime()
  //       .resize(),
  //   );
  // }

  // switch (user.step) {
  //   case "create-poll":
  //     return await savePollData(ctx, user);
  //   case "add-option":
  //     return await savePollOption(ctx, user);
  //   default:
  //     break;
  // }
});

bot.on(["message", "edited_message"], async (ctx, next) => {
  const user = await User.findOne({ telegramId: ctx.from.id }).lean();

  if (!user) {
    return await ctx.reply(
      "Ботдан фойдаланиш учун пастдаги <b><i>☎️ Рақамни юбориш</i></b> тугмасини босинг 👇",
      {
        reply_markup: {
          keyboard: [[Markup.button.contactRequest("☎️ Рақамни юбориш")]],
          resize_keyboard: true,
        },
        parse_mode: "HTML",
      },
    );
  }

  switch (user.step) {
    case "create-poll-title":
      await addTempPollTitle(ctx);
      break;
    case "create-poll":
      await addPollData(ctx, user);
      break;
    case "add-option":
      await addPollOption(ctx, user);
      break;
    default:
      await next();
      break;
  }
});

const seePoll = async (ctx, next) => {
  try {
    const pollId = ctx.callbackQuery.data.split("_")[1];
    const poll = await Poll.findById(pollId).lean();
    if (!poll) {
      return ctx.reply("Сўровнома топилмади");
    }

    // delete pollList message
    await ctx.deleteMessage();

    const buttons = poll.options?.map((option, index) => [
      Markup.button.callback(
        `(${option.votes}) ${option.text}`,
        `vote_${pollId}_${index}`,
      ),
      Markup.button.callback("❌", `delete-option_${pollId}_${index}`),
    ]);

    // add option button
    buttons.push([
      Markup.button.callback("➕ Add option", `add-option_${pollId}`),
    ]);

    // copy poll message
    await ctx.telegram.copyMessage(ctx.chat.id, ctx.chat.id, poll.messagsId, {
      reply_markup: {
        inline_keyboard: buttons,
      },
    });

    if (buttons.length === 0) {
      await ctx.reply("Вариантлар мавжуд эмас");
    }
  } catch (error) {
    logger.error('Хатолик:', { error });
    await ctx.reply("Хатолик. Кайтадан уриниб кўринг");
  }
};

const deletePoll = async (ctx, next) => {
  try {
    const pollId = ctx.callbackQuery.data.split("_")[1];
    await Poll.findByIdAndDelete(pollId).lean();
    await User.updateMany(
      { votes: { $elemMatch: { pollId } } },
      {
        $pull: {
          votes: { pollId },
        },
      },
    );
    const polls = await Poll.find({});
    if (polls.length === 0) {
      return await ctx.answerCbQuery("Сўровнома топилмади");
    }
    const buttons = polls.map((poll) => [
      [
        Markup.button.callback(
          `${poll.active ? "✅" : "❌"}-${poll.title}`,
          `toggle_${poll._id}`,
        ),
      ],
      [
        Markup.button.callback("👀", `see-poll_${poll._id}`),
        Markup.button.callback("🗑", `delete-poll_${poll._id}`),
        Markup.button.callback("🔗", `publish-poll_${poll._id}`),
      ],
    ]);
    // Flatten the buttons array for Telegraf
    const flattenedButtons = [].concat(...buttons);

    // reply without any words onyl inline button
    await ctx.editMessageReplyMarkup({
      inline_keyboard: flattenedButtons,
      resize_keyboard: true,
    });
  } catch (error) {
    logger.error('Хатолик:', { error });
    await ctx.reply("Хатолик. Кайтадан уриниб кўринг");
  }
};

const tooglePoll = async (ctx, next) => {
  try {
    const pollId = ctx.callbackQuery.data.split("_")[1];
    const poll = await Poll.findById(pollId);
    if (!poll) {
      return ctx.reply("Сўровнома топилмади");
    }
    poll.active = !poll.active;
    await poll.save();
    const polls = await Poll.find({}).lean();
    if (polls.length === 0) {
      return ctx.reply("Сўровнома топилмади");
    }

    const buttons = polls.map((poll) => [
      [
        Markup.button.callback(
          `${poll.active ? "✅" : "❌"}-${poll.title}`,
          `toggle_${poll._id}`,
        ),
      ],
      [
        Markup.button.callback("👀", `see-poll_${poll._id}`),
        Markup.button.callback("🗑", `delete-poll_${poll._id}`),
        Markup.button.callback("🔗", `publish-poll_${poll._id}`),
      ],
    ]);

    // Flatten the buttons array for Telegraf
    const flattenedButtons = [].concat(...buttons);

    // reply without any words onyl inline button
    await ctx.editMessageReplyMarkup({
      inline_keyboard: flattenedButtons,
      resize_keyboard: true,
    });
  } catch (error) {
    logger.error('Хатолик:', { error });
    await ctx.reply("Хатолик. Кайтадан уриниб кўринг");
  }
};

const publishPoll = async (ctx, next) => {
  try {
    const pollId = ctx.callbackQuery.data.split("_")[1];

    //  send poll to channel
    const poll = await Poll.findById(pollId);

    if (!poll) {
      return await ctx.reply("Сўровнома топилмади");
    }

    if (!poll.active) {
      return await ctx.reply("Сўровнома актив эмас");
    }

    const buttons = poll.options.map((option, index) => [
      Markup.button.url(
        `(${option.votes}) ${option.text}`,
        `https://t.me/${ctx.botInfo.username}?start=vote_${pollId}_${index}`,
      ),
    ]);

    const messsage = await ctx.telegram.copyMessage(
      process.env.TRACKED_CHANNEL,
      ctx.chat.id,
      poll.messagsId,
      {
        reply_markup: {
          inline_keyboard: buttons,
        },
      },
    );

    // save message id
    poll.messagsIdInChannel = messsage.message_id;
    await poll.save();

    await ctx.reply("Сўровнома каналга юборилди");
  } catch (error) {
    logger.error('Хатолик:', { error });
    await ctx.reply("Хатолик. Кайтадан уриниб кўринг");
  }
};

// user functions
const choosePoll = async (ctx, next) => {
  try {
    const pollId = await ctx.callbackQuery.data.split("_")[1];
    const poll = await Poll.findById(pollId).lean();
    if (!poll) {
      return await ctx.reply("Сўровнома топилмади");
    }
    const user = await User.findOne({ telegramId: ctx.from.id });

    const existingVote = user.votes.find((vote) => vote.pollId === pollId);

    if (!user) {
      return await ctx.reply(
        "Ботдан фойдаланиш учун пастдаги <b><i>☎️ Рақамни юбориш</i></b> тугмасини босинг 👇",
        {
          reply_markup: {
            keyboard: [[Markup.button.contactRequest("☎️ Рақамни юбориш")]],
            resize_keyboard: true,
          },
          parse_mode: "HTML",
        },
      );
    }

    let buttons = poll.options.map((option, index) => [
      Markup.button.callback(
        `(${option.votes}) ${option.text} ${existingVote && existingVote.optionIndex === index ? " ✅" : ""
        }`,
        `vote_${pollId}_${index}`,
      ),
    ]);

    // copy poll message
    // handle error if poll message not found
    try {
      await ctx.telegram.copyMessage(
        ctx.chat.id,
        process.env.TRACKED_CHANNEL,
        poll.messagsIdInChannel,
        {
          reply_markup: {
            inline_keyboard: buttons,
          },
        },
      );
    } catch (error) {
      logger.error('Хатолик:', { error });
      await ctx.reply("Эхтимол бу сўровнома тугаган, ёки каналга юборилмаган");
    }
  } catch (error) {
    logger.error('Хатолик:', { error });

    await ctx.reply("Хатолик: " + error.message);
  }
};

const votePoll = async (ctx, next) => {
  // get pollId and optionIndex
  try {
    const args = ctx.callbackQuery.data.split("_").slice(1);
    const pollId = args[0];
    const optionIndex = parseInt(args[1]);

    if (!pollId || isNaN(optionIndex)) {
      return await ctx.answerCbQuery("Invalid arguments.");
    }

    const poll = await Poll.findById(pollId);

    if (!poll) {
      return await ctx.answerCbQuery("Сўровнома топилмади");
    }

    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      return await ctx.answerCbQuery("Invalid option index.");
    }

    if (!poll.active) {
      // delete all previous messages
      return await ctx.answerCbQuery("Сўровнома актив эмас");
    }

    const user = await User.findOne({ telegramId: ctx.from.id });

    if (!user) {
      return await ctx.reply(
        "Ботдан фойдаланиш учун пастдаги <b><i>☎️ Рақамни юбориш</i></b> тугмасини босинг 👇",
        {
          reply_markup: {
            keyboard: [[Markup.button.contactRequest("☎️ Рақамни юбориш")]],
            resize_keyboard: true,
          },
          parse_mode: "HTML",
        },
      );
    }

    if (ctx.from.id !== parseInt(process.env.ADMIN_CHAT_ID, 10)) {
      if (!(await isUserSubscribed(ctx))) {
        return await ctx.reply(
          "❗️Илтимос, сўровномада иштирок этиш учун қуйидаги 1 та каналга аъзо бўлинг.",
          {
            reply_markup: {
              inline_keyboard: [
                [
                  Markup.button.url(
                    "Каналга обуна бўлиш",
                    `https://t.me/${process.env.TRACKED_CHANNEL.split("@")[1]}`,
                  ),
                ],
                [Markup.button.callback("✅ Обуна бўлдим", `subscribe`)],
              ],
              resize_keyboard: true,
            },
          },
        );
      }
    }

    const existingVote = user.votes.find((vote) => vote.pollId === pollId);

    if (existingVote) {
      if (existingVote.optionIndex !== optionIndex) {
        poll.options[existingVote.optionIndex].votes -= 1;
        user.votes = user.votes.map((vote) => {
          if (vote.pollId === pollId) {
            vote.optionIndex = optionIndex;
          }
          return vote;
        });
        poll.options[optionIndex].votes += 1;
      } else {
        user.votes = user.votes.filter((vote) => vote.pollId !== pollId);
        poll.options[existingVote.optionIndex].votes -= 1;
      }
    } else {
      user.votes.push({ pollId, optionIndex });
      poll.options[optionIndex].votes += 1;
    }

    await user.save();

    await poll.save();

    let buttons = [];

    if (ctx.from.id === parseInt(process.env.ADMIN_CHAT_ID, 10)) {
      buttons = poll.options.map((option, index) => [
        Markup.button.callback(
          `(${option.votes}) ${option.text}`,
          `vote_${pollId}_${index}`,
        ),
        Markup.button.callback("❌", `delete-option_${pollId}_${index}`),
      ]);
      buttons.push([
        Markup.button.callback("➕ Add option", `add-option_${pollId}`),
      ]);
    } else {
      const newExistingVote = user.votes.find((vote) => vote.pollId === pollId);

      buttons = poll.options.map((option, index) => [
        Markup.button.callback(
          `(${option.votes}) ${option.text} ${newExistingVote && newExistingVote.optionIndex === index
            ? " ✅"
            : ""
          }`,
          `vote_${pollId}_${index}`,
        ),
      ]);
    }

    // edit current poll message
    await ctx.editMessageReplyMarkup({
      inline_keyboard: buttons,
    });

    // if messagsIdInChannel is not null, edit message in channel only buttons
    if (poll.messagsIdInChannel) {
      let channelButtons = poll.options.map((option, index) => [
        Markup.button.url(
          `(${option.votes}) ${option.text}`,
          `https://t.me/${process.env.TRACKED_CHANNEL.split("@")[1]
          }/?start=${pollId}_${index}`,
        ),
      ]);
      await ctx.telegram.editMessageReplyMarkup(
        process.env.TRACKED_CHANNEL,
        poll.messagsIdInChannel,
        null,
        {
          inline_keyboard: channelButtons,
        },
      );
    }
  } catch (error) {
    logger.error('Хатолик:', { error });
  }
};

// Admin actions
bot.action(/see-poll_/, checkIsAdmin, seePoll);
bot.action(/delete-poll_/, checkIsAdmin, deletePoll);
bot.action(/toggle_/, checkIsAdmin, tooglePoll);
bot.action(/publish-poll_/, checkIsAdmin, isBotAdminInChannel, publishPoll);
bot.action(/add-option_/, checkIsAdmin, createPollOption);
bot.action(/delete-option_/, checkIsAdmin, deletePollOption);

const subscribe = async (ctx, next) => {
  try {
    const user = await User.findOne({ telegramId: ctx.from.id });

    if (!user) {
      return await ctx.reply(
        "Ботдан фойдаланиш учун пастдаги <b><i>☎️ Рақамни юбориш</i></b> тугмасини босинг 👇",
        {
          reply_markup: {
            keyboard: [[Markup.button.contactRequest("☎️ Рақамни юбориш")]],
            resize_keyboard: true,
          },
          parse_mode: "HTML",
        },
      );
    }

    const subscribed = await isUserSubscribed(ctx);

    if (!subscribed) {
      return await ctx.reply(
        "❗️Илтимос, сўровномада иштирок этиш учун қуйидаги 1 та каналга аъзо бўлинг.",
        {
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.url(
                  "Каналга обуна бўлиш",
                  `https://t.me/${process.env.TRACKED_CHANNEL.split("@")[1]}`,
                ),
              ],
              [Markup.button.callback("✅ Обуна бўлдим", `subscribe`)],
            ],
            resize_keyboard: true,
          },
        },
      );
    }

    await ctx.deleteMessage();
  } catch (error) {
    logger.error('Хатолик:', { error });
    ctx.reply("Хатолик");
  }
};

// User actions
bot.action(/poll_/, choosePoll);
bot.action(/vote_/, votePoll);
bot.action(/subscribe/, subscribe);

// bot.telegram.setMyCommands([
//   { command: "start", description: "Start | Restart" },
// ]);
