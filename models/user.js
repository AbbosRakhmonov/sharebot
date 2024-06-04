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
});

module.exports = mongoose.model("User", userSchema);
