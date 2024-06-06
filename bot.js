require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const rateLimit = require("telegraf-ratelimit");
const mongoose = require("mongoose");
const Poll = require("./models/poll");
const User = require("./models/user");
const bot = new Telegraf(process.env.BOT_TOKEN);

// const limitConfig = {
//   window: 3000,
//   limit: 1,
//   onLimitExceeded: (ctx, next) => ctx.reply("Rate limit exceeded"),
// };

// bot.use(rateLimit(limitConfig));

const adminKeyboards = [["Create Poll", "List Polls"]];
const userKeyboards = [["Vote"]];

const checkIsAdmin = async (ctx, next) => {
  if (ctx.from.id !== parseInt(process.env.ADMIN_CHAT_ID, 10)) {
    return await ctx.reply("You are not authorized to use this command.");
  }
  return await next();
};

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI).then(() => {
  console.log("Connected to MongoDB");
});

// Utility function to check if a user is subscribed to required channels
async function isUserSubscribed(ctx) {
  const chatMember = await ctx.telegram.getChatMember(
    process.env.TRACKED_CHANNEL,
    ctx.from.id,
  );
  if (chatMember.status === "left" || chatMember.status === "kicked") {
    return false;
  }
  return true;
}

async function isBotAdminInChannel(ctx, next) {
  const chatMember = await ctx.telegram.getChatMember(
    process.env.TRACKED_CHANNEL,
    ctx.botInfo.id,
  );
  if (
    !chatMember.status === "administrator" ||
    !chatMember.status === "creator"
  ) {
    await ctx.reply(
      "You need to be an admin in the channel to use this command.",
    );
  }
  return await next();
}

// Request contact info
bot.command("start", async (ctx) => {
  // If user has not registered before, ask for contact info or send just simple message
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) {
    await ctx.reply(
      "Welcome! Please share your contact number to proceed.",
      Markup.keyboard([Markup.button.contactRequest("Share Contact")])
        .oneTime()
        .resize(),
    );
  } else {
    if (ctx.from.id !== parseInt(process.env.ADMIN_CHAT_ID, 10)) {
      await ctx.reply("Welcome!", {
        reply_markup: {
          keyboard: userKeyboards,
          resize_keyboard: true,
        },
      });
    } else {
      // send all commands available to admin
      await ctx.reply("Welcome!", {
        reply_markup: {
          keyboard: adminKeyboards,
          resize_keyboard: true,
        },
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
});

bot.on("contact", async (ctx) => {
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
    await ctx.reply("Thank you! Your contact number has been saved.", {
      reply_markup: {
        keyboard: [
          [
            {
              text: "Vote",
            },
          ],
        ],
        resize_keyboard: true,
      },
    });
  } else {
    await ctx.reply("Thank you! Your contact number has been saved.", {
      reply_markup: {
        keyboard: adminKeyboards,
        resize_keyboard: true,
      },
    });
  }
});

const voteToPoll = async (ctx) => {
  const polls = await Poll.find({ active: true }).select("title").lean();
  if (polls.length === 0) {
    return ctx.reply("No active polls found.");
  }
  const buttons = polls.map((poll) => [
    Markup.button.callback(poll.title, `poll_${poll._id}`),
  ]);
  await ctx.deleteMessage();
  await ctx.reply(
    "Select a poll to vote:",
    Markup.inlineKeyboard(buttons).resize(),
  );
};

const listPolls = async (ctx) => {
  const polls = await Poll.find({}).lean();
  if (polls.length === 0) {
    return ctx.reply("No polls found.");
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
  ])[0];

  await ctx.reply(`<b>Polls:</b>`, {
    reply_markup: {
      inline_keyboard: buttons,
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

  await ctx.reply("Enter poll title", {
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
  await ctx.reply("Poll creation canceled.", {
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
  const { message, edited_message } = ctx.update;
  let tempPollTitle = message?.text.trim() || edited_message?.text.trim();
  try {
    if (!tempPollTitle) {
      return await ctx.reply("Please enter a poll title.");
    }

    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      { tempPollTitle },
    ).lean();
  } catch (error) {
    console.log(error);
    await ctx.reply("Something went wrong. Please try again later.");
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

    await ctx.reply("Enter poll post", {
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
    console.log(error);
    await ctx.reply("Something went wrong. Please try again later.");
  }
};

const addPollData = async (ctx, user) => {
  let tempPollMessageId = null;

  if (ctx.message) {
    tempPollMessageId = ctx.message.message_id;
  } else if (ctx.edited_message) {
    tempPollMessageId = ctx.edited_message.message_id;
  }

  if (!tempPollMessageId) {
    return await ctx.reply("Please enter a poll.");
  }

  try {
    await User.findOneAndUpdate(
      { telegramId: user.telegramId },
      { tempPollMessageId },
    ).lean();
  } catch (error) {
    console.log(error);
    await ctx.reply("Something went wrong. Please try again later.");
  }
};

const savePollData = async (ctx, user) => {
  // check the message still exist
  const tempPollMessageId = user.tempPollMessageId;
  if (!tempPollMessageId) {
    return await ctx.reply("Please enter a poll.");
  }

  try {
    await User.findOneAndUpdate(
      { telegramId: user.telegramId },
      { step: "", tempPollMessageId: null, pollOptions: [] },
    ).lean();

    if (!user.tempPollTitle) {
      return await ctx.reply("/start at first");
    }

    await Poll.create({
      title: user.tempPollTitle,
      messagsId: tempPollMessageId,
      options: [],
    });

    await ctx.reply("Poll created successfully.", {
      reply_markup: {
        keyboard: adminKeyboards,
        resize_keyboard: true,
      },
    });
  } catch (error) {
    console.log(error);
    await ctx.reply("Something went wrong. Please try again later.");
  }
};

const createPollOption = async (ctx) => {
  try {
    const currentPollId = ctx.callbackQuery.data.split("_")[1];
    const poll = await Poll.findById(currentPollId).lean();

    if (!poll) {
      return await ctx.reply("Poll not found.");
    }

    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      {
        step: "add-option",
        currentPollId,
      },
    ).lean();

    await ctx.reply("Enter poll option", {
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
    console.log(error);
    await ctx.reply("Something went wrong. Please try again later.");
  }
};

const addPollOption = async (ctx, user) => {
  try {
    const currentPollId = user.currentPollId;

    const poll = await Poll.findById(currentPollId).lean();

    if (!poll) {
      return await ctx.reply("Poll not found.");
    }

    const { message, edited_message } = ctx.update;

    let pollOption = message?.text.trim() || edited_message?.text.trim();

    if (!pollOption) {
      return await ctx.reply("Please enter a poll option.");
    }

    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      { tempPollOption: pollOption },
    ).lean();
  } catch (error) {
    console.log(error);
    await ctx.reply("Something went wrong. Please try again later.");
  }
};

const saveTempPollOption = async (ctx) => {
  try {
    const user = await User.findOne({ telegramId: ctx.from.id }).lean();

    const currentPollOption = user.tempPollOption;

    if (!currentPollOption) {
      return await ctx.reply("Please enter a poll option.");
    }

    const poll = await Poll.findById(user.currentPollId);

    if (!poll) {
      return await ctx.reply("Poll not found.");
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
    console.log(error);
    await ctx.reply("Something went wrong. Please try again later.");
  }
};

const deletePollOption = async (ctx) => {
  try {
    const pollId = ctx.callbackQuery.data.split("_")[1];
    const poll = await Poll.findById(pollId);

    if (!poll) {
      return await ctx.reply("Poll not found.");
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
    console.log(error);
    await ctx.reply("Something went wrong. Please try again later.");
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
    case "Vote":
      return await voteToPoll(ctx);
    case "List Polls":
      await checkIsAdmin(ctx, next);
      return await listPolls(ctx);
    case "Create Poll":
      await checkIsAdmin(ctx, next);
      return await createPoll(ctx);
    case "Cancel ❌":
      return await cancelCommand(ctx);
    case "Done ✅":
      return await doneCommand(ctx);
    default:
      break;
  }

  // const user = await User.findOne({ telegramId: ctx.from.id });

  // if (!user) {
  //   return await ctx.reply(
  //     "Please share your contact number to proceed.",
  //     Markup.keyboard([Markup.button.contactRequest("Share Contact")])
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

  await next();
});

bot.on(["message", "edited_message"], async (ctx, next) => {
  const user = await User.findOne({ telegramId: ctx.from.id }).lean();

  if (!user) {
    return await next();
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
      return await next();
  }
});

const seePoll = async (ctx) => {
  const pollId = ctx.callbackQuery.data.split("_")[1];
  const poll = await Poll.findById(pollId).lean();
  if (!poll) {
    return ctx.reply("Poll not found.");
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
    await ctx.reply("There are no options yet.");
  }
};

const deletePoll = async (ctx) => {
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
      return await ctx.answerCbQuery("No polls found.");
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
    ])[0];
    // reply without any words onyl inline button
    await ctx.editMessageReplyMarkup({
      inline_keyboard: buttons,
      resize_keyboard: true,
    });
  } catch (error) {
    console.log(error);
  }
};

const tooglePoll = async (ctx) => {
  const pollId = ctx.callbackQuery.data.split("_")[1];
  const poll = await Poll.findById(pollId);
  if (!poll) {
    return ctx.reply("Poll not found.");
  }
  poll.active = !poll.active;
  await poll.save();
  const polls = await Poll.find({}).lean();
  if (polls.length === 0) {
    return ctx.reply("No polls found.");
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
  ])[0];
  // reply without any words onyl inline button
  await ctx.editMessageReplyMarkup({
    inline_keyboard: buttons,
    resize_keyboard: true,
  });
};

const publishPoll = async (ctx) => {
  const pollId = ctx.callbackQuery.data.split("_")[1];

  //  send poll to channel
  const poll = await Poll.findById(pollId).lean();

  if (!poll) {
    return await ctx.reply("Poll not found.");
  }

  if (!poll.active) {
    return await ctx.reply("Poll not active.");
  }

  const buttons = poll.options.map((option, index) => [
    Markup.button.url(
      `(${option.votes}) ${option.text}`,
      `https://t.me/${ctx.botInfo.username}?start=vote_${pollId}_${index}`,
    ),
  ]);

  await ctx.telegram.copyMessage(
    process.env.TRACKED_CHANNEL,
    ctx.chat.id,
    poll.messagsId,
    {
      reply_markup: {
        inline_keyboard: buttons,
      },
    },
  );

  await ctx.reply("Poll published to channel.");
};

// user functions
const choosePoll = async (ctx) => {
  const pollId = ctx.callbackQuery.data.split("_")[1];
  const poll = await Poll.findById(pollId).lean();
  if (!poll) {
    return ctx.answerCbQuery("Poll not found.");
  }
  const user = await User.findOne({ telegramId: ctx.from.id });

  const existingVote = user.votes.find(
    (vote) => vote.pollId.toString() === pollId,
  );

  if (!user) {
    return await ctx.reply(
      "Please share your contact number to proceed.",
      Markup.keyboard([Markup.button.contactRequest("Share Contact")])
        .oneTime()
        .resize(),
    );
  }

  ctx.deleteMessage();
  ctx.reply(poll.title, {
    reply_markup: {
      inline_keyboard: poll.options.map((option, index) => [
        {
          text: `${option.text} (${option.votes}) ${
            existingVote && existingVote.optionIndex === index ? " ✅" : ""
          }`,
          callback_data: `vote_${pollId}_${index}`,
        },
      ]),
    },
  });
};

const votePoll = async (ctx) => {
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
      return await ctx.answerCbQuery("Poll not found.");
    }

    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      return await ctx.answerCbQuery("Invalid option index.");
    }

    if (!poll.active) {
      // delete all previous messages
      return await ctx.answerCbQuery("Poll is not active.");
    }

    const user = await User.findOne({ telegramId: ctx.from.id });

    if (!user) {
      return await ctx.reply(
        "Please share your contact number to proceed.",
        Markup.keyboard([Markup.button.contactRequest("Share Contact")])
          .oneTime()
          .resize(),
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
                  Markup.button.callback("✅ Обуна бўлдим", `subscribe`),
                ],
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

    await ctx.answerCbQuery(
      `You ${existingVote ? "un" : ""}voted for option: ${
        poll.options[optionIndex].text
      }`,
    );

    let buttons = [];

    if (ctx.from.id == process.env.ADMIN_CHAT_ID) {
      buttons = poll.options.map((option, index) => [
        Markup.button.callback(
          `(${option.votes}) ${option.text}`,
          `vote_${pollId}_${index}`,
        ),
        Markup.button.callback("❌", `delete-option_${pollId}_${index}`),
      ]);
    } else {
      const newExistingVote = user.votes.find((vote) => vote.pollId === pollId);

      buttons = pool.options.map((option, index) => [
        Markup.button.callback(
          `${option.text} (${option.votes}) ${
            newExistingVote && newExistingVote.optionIndex === index
              ? " ✅"
              : ""
          }`,
          `vote_${pollId}_${index}`,
        ),
      ]);
    }

    buttons.push([
      Markup.button.callback("➕ Add option", `add-option_${pollId}`),
    ]);

    // edit current poll message
    await ctx.editMessageReplyMarkup({
      inline_keyboard: buttons,
    });
  } catch (error) {
    console.log(error);
    ctx.answerCbQuery("Something went wrong. Please try again later.");
  }
};

// Admin actions
bot.action(/see-poll_/, checkIsAdmin, seePoll);
bot.action(/delete-poll_/, checkIsAdmin, deletePoll);
bot.action(/toggle_/, checkIsAdmin, tooglePoll);
bot.action(/publish-poll_/, checkIsAdmin, isBotAdminInChannel, publishPoll);
bot.action(/add-option_/, checkIsAdmin, createPollOption);
bot.action(/delete-option_/, checkIsAdmin, deletePollOption);

const subscribe = async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });

  if (!user) {
    return await ctx.reply(
      "Please share your contact number to proceed.",
      Markup.keyboard([Markup.button.contactRequest("Share Contact")])
        .oneTime()
        .resize(),
    );
  }

  const subscribed = await isUserSubscribed(ctx);

  if (!subscribed) {
    await ctx.reply(
      "❗️Илтимос, сўровномада иштирок этиш учун қуйидаги 1 та каналга аъзо бўлинг.",
    );
    return await ctx.reply("Каналга обуна бўлиш", {
      reply_markup: {
        inline_keyboard: [
          [
            Markup.button.url(
              "Каналга обуна бўлиш",
              `https://t.me/${process.env.TRACKED_CHANNEL.split("@")[1]}`,
            ),
            Markup.button.callback("✅ Обуна бўлдим", `subscribe`),
          ],
        ],
        resize_keyboard: true,
      },
    });
  }

  await ctx.deleteMessage();
};

// User actions
bot.action(/poll_/, choosePoll);
bot.action(/vote_/, votePoll);
bot.action(/subscribe/, subscribe);

bot.telegram.setMyCommands([
  { command: "start", description: "Start | Restart" },
]);

// Handling deep links
bot.start(async (ctx) => {
  const deepLink = ctx.startPayload; // This contains the part after t.me/bot?start=
  if (deepLink.startsWith("vote")) {
    const [_, pollId] = deepLink.split("_");
    const poll = await Poll.findById(pollId).lean();
    if (poll) {
      const buttons = poll.options.map((option, index) => [
        Markup.button.callback(option.text, `vote_${pollId}_${index}`),
      ]);

      buttons.push([
        Markup.button.url(
          "Share this poll",
          `https://t.me/${ctx.botInfo.username}?start=vote_${pollId}`,
        ),
      ]);

      await ctx.reply(poll.title, Markup.inlineKeyboard(buttons).resize());
    } else {
      ctx.reply("Poll not found.");
    }
  } else {
    ctx.reply("Welcome! Use /vote to participate in polls.");
  }
});

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
