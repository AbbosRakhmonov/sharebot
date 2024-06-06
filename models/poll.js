const mongoose = require("mongoose");

const pollSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  messagsId: {
    type: Number,
    required: true,
  },
  messagsIdInChannel: Number,
  options: [
    {
      text: String,
      votes: { type: Number, default: 0 },
    },
  ],
  active: { type: Boolean, default: true },
});

module.exports = mongoose.model("Poll", pollSchema);
