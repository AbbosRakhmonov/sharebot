const { Telegraf, session } = require("telegraf");
const rateLimit = require("telegraf-ratelimit");
const { message } = require("telegraf/filters");
const tracker = require("./middlewares/tracker");
const auth = require("./middlewares/auth");
const startCommand = require("./commands/start");
const saveContact = require("./commands/saveContact");
const voteToPoll = require("./commands/user/listActivePolls");
const listPolls = require("./commands/admin/listPolls");
const createPoll = require("./commands/admin/createPoll");
const checkIsAdmin = require("./middlewares/isAdmin");
const clearLastStep = require("./commands/admin/clearLastStep");
const doneCommand = require("./commands/admin/doneCommand");
// const contact = require("./commands/requiredContact");
const addTempPollTitle = require("./commands/admin/addTempPollTitle");
const addPollData = require("./commands/admin/addPollData");
const addPollOption = require("./commands/admin/addPollOption");
const seePool = require("./commands/admin/seePoll");
const deletePool = require("./commands/admin/deletePoll");
const tooglePoll = require("./commands/admin/togglePoll");
const createPollOption = require("./commands/admin/createPollOption");
const deletePollOption = require("./commands/admin/deletePollOption");
const publishPoll = require("./commands/admin/publishPoll");
const isBotAdminInChannel = require("./middlewares/isBotAdminInChannel");
const choosePoll = require("./commands/user/choosePoll");
const votePollAsUser = require("./commands/user/votePollAsUser");
const votePollAsAdmin = require("./commands/admin/votePollAsAdmin");
const subscribe = require("./commands/user/subscribe");
const getAllChannels = require("./commands/admin/getAllChannels");
const addChannel = require("./commands/admin/addChannel");
const saveChannel = require("./commands/admin/saveChannel");
const deleteChannel = require("./commands/admin/deleteChannel");
const checkIsUserBot = require("./middlewares/checkIsUserBot");
const refreshCaptcha = require("./commands/user/refreshCaptcha");
const continueVoting = require("./commands/user/continueVoting");
const listAds = require("./commands/admin/ads");
const addAd = require("./commands/admin/addAd");
const addTempAdTitle = require("./commands/admin/addTempAdTitle");
const addAdTempContent = require("./commands/admin/addAdTempContent");
const seeAd = require("./commands/admin/seeAd");
const changeAdActive = require("./commands/admin/changeAdActive");
const deleteAd = require("./commands/admin/deleteAd");
const publishAd = require("./commands/admin/publishAd");

require("dotenv").config();

const limitConfig = {
  window: 1000,
  limit: 1,
  onLimitExceeded: async (ctx) =>
    await ctx.reply("⚠️ Сўровингиз қайта ишланмоқда илтимос сабрли бўлинг !"),
};

// Create a new bot instance
const bot = new Telegraf(process.env.BOT_TOKEN);
console.log(process.env.BOT_TOKEN, process.env.NODE_ENV);

// Middlewares
bot.use(rateLimit(limitConfig));
bot.use(tracker);
bot.use(session());
bot.use(checkIsUserBot);
bot.use(auth);
// check bot blocked or not by user
// bot.use(async (ctx, next) => {
//   try {
//     const blocked = await ctx.telegram.getChatMember(
//       ctx.chat.id,
//       ctx.botInfo.id,
//     );
//     if (blocked.status === "kicked") {
//       // Bot is blocked by the user
//       console.log("Bot is blocked by the user");
//       // Handle the situation accordingly
//     } else {
//       // Bot is not blocked by the user
//       console.log("Bot is not blocked by the user");
//       // Continue processing the update
//       await next();
//     }
//   } catch (error) {
//     console.error("Error checking if bot is blocked:", error);
//     // Handle the error appropriately
//   }
// });

// Error handling
// bot.catch(async (err, ctx) => {
//   console.error(`Ботда ноодатий хатолик юз берди`, err);
//   await ctx.reply("Ботда ноодатий хатолик юз берди, кайтадан уриниб кўринг");
//   process.exit(1);
// });

// Register commands
bot.command("start", startCommand);

// Event listeners
bot.on(message("contact"), saveContact);

// Text messages
bot.hears("Овоз бериш", voteToPoll);
bot.hears("Барча сўровномалар", checkIsAdmin, listPolls);
bot.hears("Сўровнома яратиш", checkIsAdmin, createPoll);
bot.hears("Рекламалар", checkIsAdmin, listAds);
bot.hears("Каналлар", checkIsAdmin, getAllChannels);
bot.hears("Cancel ❌", checkIsAdmin, clearLastStep);
bot.hears("Done ✅", checkIsAdmin, doneCommand);

bot.on(["message", "edited_message"], async (ctx, next) => {
  const user = ctx.user;
  switch (user.step) {
    case "create-poll-title":
      await checkIsAdmin(ctx, next);
      return await addTempPollTitle(ctx);
    case "create-poll":
      await checkIsAdmin(ctx, next);
      return await addPollData(ctx, user);
    case "add-option":
      await checkIsAdmin(ctx, next);
      return await addPollOption(ctx, user);
    case "add-channel":
      await checkIsAdmin(ctx, next);
      return await saveChannel(ctx);
    case "add-ad-title":
      await checkIsAdmin(ctx, next);
      return await addTempAdTitle(ctx);
    case "add-ad-content":
      await checkIsAdmin(ctx, next);
      return await addAdTempContent(ctx);
    default:
      break;
  }

  if (user.step.includes("captcha")) {
    return await continueVoting(ctx);
  }
});

// custom functions
const vote = async (ctx, next) => {
  if (ctx.from.id !== parseInt(process.env.ADMIN_CHAT_ID, 10)) {
    return await votePollAsUser(ctx, next);
  }
  return await votePollAsAdmin(ctx);
};

// action listeners
bot.action(/see-poll_/, checkIsAdmin, seePool);
bot.action(/delete-poll_/, checkIsAdmin, deletePool);
bot.action(/toggle_/, checkIsAdmin, tooglePoll);
bot.action(/publish-poll_/, checkIsAdmin, isBotAdminInChannel, publishPoll);
bot.action(/add-option_/, checkIsAdmin, createPollOption);
bot.action(/delete-option_/, checkIsAdmin, deletePollOption);
bot.action(/poll_/, choosePoll);
bot.action(/vote_/, vote);
bot.action(/subscribe_/, subscribe);
bot.action(/add-channel/, checkIsAdmin, addChannel);
bot.action(/delete-channel_/, checkIsAdmin, deleteChannel);
bot.action(/refresh_captcha/, refreshCaptcha);
// ads
bot.action(/add-ad/, checkIsAdmin, addAd);
bot.action(/see-ad_/, checkIsAdmin, seeAd);
bot.action(/delete-ad_/, checkIsAdmin, deleteAd);
bot.action(/change-ad-active_/, checkIsAdmin, changeAdActive);
bot.action(/publish-ad_/, checkIsAdmin, publishAd);

module.exports = bot;
