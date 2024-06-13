const mongoose = require("mongoose");

const channelSchema = new mongoose.Schema({
  name: { type: String },
  chatId: { type: Number, required: true },
  username: { type: String, required: true },
});

module.exports = mongoose.model("Channel", channelSchema);
