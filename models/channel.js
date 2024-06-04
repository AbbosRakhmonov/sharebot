const mongoose = require("mongoose");

const channelSchema = new mongoose.Schema({
  name: String,
  channelId: String,
});

module.exports = mongoose.model("Channel", channelSchema);
