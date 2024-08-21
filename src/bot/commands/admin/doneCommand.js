const saveTempPollTitle = require("./saveTempPollTitle");
const savePollData = require("./savePollData");
const saveTempPollOption = require("./saveTempPollOption");
const doneCommand = async (ctx) => {
  switch (ctx.user.step) {
    case "create-poll-title":
      return await saveTempPollTitle(ctx);
    case "create-poll":
      return await savePollData(ctx, ctx.user);
    case "add-option":
      return await saveTempPollOption(ctx);
    default:
      break;
  }
};

module.exports = doneCommand;
