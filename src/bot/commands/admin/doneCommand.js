const saveTempPollTitle = require("./saveTempPollTitle");
const savePollData = require("./savePollData");
const saveTempPollOption = require("./saveTempPollOption");
const doneCommand = async (ctx) => {
  switch (ctx.user.step) {
    case "create-poll-title":
      await saveTempPollTitle(ctx);
      break;
    case "create-poll":
      await savePollData(ctx, ctx.user);
      break;
    case "add-option":
      await saveTempPollOption(ctx);
      break;
    default:
      break;
  }
};

module.exports = doneCommand;
