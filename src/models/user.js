const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  votes: [
    {
      pollId: String,
      optionIndex: Number,
    },
  ],
  phoneNumber: { type: String },
  step: String,
  tempPollTitle: { type: String },
  tempPollMessageId: {
    type: Number,
    default: null,
  },
  tempPollOptions: [],
  tempPollOption: { type: String },
  currentPollId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  channels: [],
});

module.exports = mongoose.model("User", userSchema);
