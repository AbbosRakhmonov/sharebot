require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const mongoose = require("mongoose");
const Poll = require("./models/poll");
const User = require("./models/user");
const Channel = require("./models/channel");

const bot = new Telegraf(process.env.BOT_TOKEN);

let commands = `Available commands:
/start - Start the bot
/createpoll <title> - Create a new poll with the given title
/addoption <poll_id> <option_text> - Add an option to the specified poll
/publishpoll <poll_id> - Publish the specified poll
/deletepoll <poll_id> - Delete the specified poll
/addchannel <channel_id> <channel_name> - Add the specified channel to the list of subscribed channels
/removechannel <channel_id> - Delete the specified channel from the list of subscribed channels
/listchannels - List all subscribed channels
/listpolls - List all polls
`;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI).then(() => {
  console.log("Connected to MongoDB");
});

// Utility function to check if a user is subscribed to required channels
async function isUserSubscribed(ctx) {
  const channels = await Channel.find({});
  const userId = ctx.from.id;
  for (const channel of channels) {
    const chatMember = await ctx.telegram.getChatMember(
      channel.channelId,
      userId,
    );
    if (chatMember.status === "left" || chatMember.status === "kicked") {
      return false;
    }
  }
  return true;
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
      // send all commands available to admin
      await ctx.reply(commands, {
        reply_markup: {
          remove_keyboard: true,
        },
      });
    }
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
  ctx.reply("Thank you! Your contact number has been saved.", {
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
});

// catch Vote command
bot.on("text", async (ctx, next) => {
  if (ctx.message.text === "Vote") {
    if (ctx.from.id !== parseInt(process.env.ADMIN_CHAT_ID, 10)) {
      // send all active polls title
      const polls = await Poll.find({ active: true }).select("title");
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
    }
  } else {
    await next();
  }
});

// Admin Commands
bot.command("createpoll", async (ctx) => {
  if (ctx.from.id !== parseInt(process.env.ADMIN_CHAT_ID, 10)) {
    return ctx.reply("You are not authorized to use this command.");
  }

  const args = ctx.message.text.split(" ").slice(1);
  const title = args.join(" ");
  if (!title) {
    return ctx.reply("Please provide a title for the poll.");
  }

  const poll = new Poll({ title, options: [] });
  await poll.save();
  ctx.reply(`Poll created with title: ${title} and ID`);
});

bot.command("addoption", async (ctx) => {
  if (ctx.from.id !== parseInt(process.env.ADMIN_CHAT_ID, 10)) {
    return ctx.reply("You are not authorized to use this command.");
  }

  const args = ctx.message.text.split(" ").slice(1);
  const pollId = args[0];
  const optionText = args.slice(1).join(" ");
  if (!pollId || !optionText) {
    return ctx.reply("Please provide a poll ID and option text.");
  }

  const poll = await Poll.findById(pollId);
  if (!poll) {
    return ctx.reply("Poll not found.");
  }

  poll.options.push({ text: optionText, votes: 0 });
  await poll.save();
  ctx.reply(`Option added to poll: ${optionText}`);
});

bot.command("deletepoll", async (ctx) => {
  if (ctx.from.id !== parseInt(process.env.ADMIN_CHAT_ID, 10)) {
    return ctx.reply("You are not authorized to use this command.");
  }

  const args = ctx.message.text.split(" ").slice(1);
  const pollId = args[0];
  if (!pollId) {
    return ctx.reply("Please provide a poll ID.");
  }

  await Poll.findByIdAndDelete(pollId);
  ctx.reply("Poll deleted.");
});

// Channel management commands
bot.command("addchannel", async (ctx) => {
  if (ctx.from.id !== parseInt(process.env.ADMIN_CHAT_ID, 10)) {
    return ctx.reply("You are not authorized to use this command.");
  }

  const args = ctx.message.text.split(" ").slice(1);
  const channelId = args[0];
  const channelName = args.slice(1).join(" ");

  if (!channelId || !channelName) {
    return ctx.reply("Please provide a channel ID and channel name.");
  }

  const channel = new Channel({ channelId, name: channelName });
  await channel.save();
  ctx.reply(`Channel added: ${channelName}`);
});

bot.command("removechannel", async (ctx) => {
  if (ctx.from.id !== parseInt(process.env.ADMIN_CHAT_ID, 10)) {
    return ctx.reply("You are not authorized to use this command.");
  }

  const args = ctx.message.text.split(" ").slice(1);
  const channelId = args[0];

  if (!channelId) {
    return ctx.reply("Please provide a channel ID.");
  }

  await Channel.findOneAndDelete({ channelId });
  ctx.reply("Channel removed.");
});

bot.command("listchannels", async (ctx) => {
  if (ctx.from.id !== parseInt(process.env.ADMIN_CHAT_ID, 10)) {
    return ctx.reply("You are not authorized to use this command.");
  }

  const channels = await Channel.find({});
  if (channels.length === 0) {
    return ctx.reply("No channels found.");
  }

  const channelList = channels
    .map((channel) => `${channel.name} (${channel.channelId})`)
    .join("\n");
  ctx.reply(`Channels:\n${channelList}`);
});

// User Commands
bot.action(/poll_(.+)/, async (ctx) => {
  const pollId = ctx.match[1];
  const poll = await Poll.findById(pollId);
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
});

bot.action(/vote_(.+)/, async (ctx) => {
  const args = ctx.match[1].split("_");
  const pollId = args[0];
  const optionIndex = parseInt(args[1]);

  if (!pollId || isNaN(optionIndex)) {
    return ctx.answerCbQuery("Invalid arguments.");
  }

  const poll = await Poll.findById(new mongoose.Types.ObjectId(pollId));

  if (!poll) {
    return ctx.answerCbQuery("Poll not found.");
  }

  if (optionIndex < 0 || optionIndex >= poll.options.length) {
    return ctx.answerCbQuery("Invalid option index.");
  }

  if (!poll.active) {
    // delete all previous messages
    return ctx.answerCbQuery("Poll is not active.");
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

  if (!(await isUserSubscribed(ctx))) {
    return ctx.answerCbQuery(
      "You must be subscribed to the required channels to vote.",
    );
  }

  const existingVote = user.votes.find((vote) => vote.pollId === pollId);

  if (existingVote) {
    poll.options[existingVote.optionIndex].votes -= 1;
    user.votes = user.votes.filter((vote) => vote.pollId.toString() !== pollId);
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

  const newPool = await Poll.findById(new mongoose.Types.ObjectId(pollId));
  const newExistingVote = user.votes.find(
    (vote) => vote.pollId.toString() === pollId,
  );

  const buttons = newPool.options.map((option, index) => [
    Markup.button.callback(
      `${option.text} (${option.votes}) ${
        newExistingVote && newExistingVote.optionIndex === index ? " ✅" : ""
      }`,
      `vote_${pollId}_${index}`,
    ),
  ]);
  // edit poll message with new vote

  await ctx.editMessageText(newPool.title, {
    reply_markup: {
      inline_keyboard: buttons,
    },
  });
});

// Creating a poll with inline buttons and share button
bot.command("publishpoll", async (ctx) => {
  if (ctx.from.id !== parseInt(process.env.ADMIN_CHAT_ID, 10)) {
    return ctx.reply("You are not authorized to use this command.");
  }

  const args = ctx.message.text.split(" ").slice(1);
  const pollId = args[0];
  if (!pollId) {
    return ctx.reply("Please provide a poll ID.");
  }

  const poll = await Poll.findById(pollId);
  if (!poll) {
    return ctx.reply("Poll not found.");
  }

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
});

// List all polls
bot.command("listpolls", async (ctx) => {
  const polls = await Poll.find({});
  if (polls.length === 0) {
    return ctx.reply("No polls found.");
  }

  // sennd pollList as inline button with publish button next to it and when user click on that button it will toggle active property when publish button is clicked it will publish the poll
  const buttons = polls.map((poll) => [
    Markup.button.callback(
      `${poll.title}-${poll.active ? "✅" : "❌"}`,
      `toggle_${poll._id}`,
    ),
    Markup.button.callback("🔗", `publishpoll_${poll._id}`),
  ]);
  await ctx.reply("Polls:", {
    reply_markup: {
      inline_keyboard: buttons,
      resize_keyboard: true,
    },
  });
});

bot.action(/toggle_(.+)/, async (ctx) => {
  const pollId = ctx.match[1];
  const poll = await Poll.findById(pollId);
  if (!poll) {
    return ctx.reply("Poll not found.");
  }
  poll.active = !poll.active;
  await poll.save();
  // delete pollList message
  await ctx.deleteMessage();
  const polls = await Poll.find({});
  if (polls.length === 0) {
    return ctx.reply("No polls found.");
  }
  const buttons = polls.map((poll) => [
    Markup.button.callback(
      `${poll.title}-${poll.active ? "✅" : "❌"}`,
      `toggle_${poll._id}`,
    ),
    Markup.button.callback("🔗", `publishpoll_${poll._id}`),
  ]);
  // reply without any words onyl inline button
  await ctx.reply("Polls:", Markup.inlineKeyboard(buttons).oneTime().resize());
});

bot.action(/publishpoll_(.+)/, async (ctx) => {
  const pollId = ctx.match[1];
  const poll = await Poll.findById(pollId);
  if (!poll) {
    return ctx.reply("Poll not found.");
  }

  poll.active = true;
  await poll.save();

  // delete pollList message
  await ctx.deleteMessage();

  // switch inline query to poll
  // https://core.telegram.org/bots/api#answerinlinequery

  const buttons = poll.options.map((option) => [
    Markup.button.url(
      option.text,
      `https://t.me/${ctx.botInfo.username}?start=vote_${pollId}`,
    ),
  ]);

  await ctx.reply(
    poll.title,
    Markup.inlineKeyboard(buttons).oneTime().resize(),
  );
});

// Handling deep links
bot.start(async (ctx) => {
  const deepLink = ctx.startPayload; // This contains the part after t.me/bot?start=
  if (deepLink.startsWith("vote")) {
    const [_, pollId] = deepLink.split("_");
    const poll = await Poll.findById(pollId);
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
