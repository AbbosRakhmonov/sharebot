const mongoose = require("mongoose");
const moment = require("moment-timezone");

const advertSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true,
    },
    messageId: {
      type: Number,
      required: true,
    },
    active: { type: Boolean, default: true },
  },
  {
    versionKey: false,
    timestamps: { currentTime: () => moment.tz(Date.now(), "Asia/Tashkent") },
  },
);

module.exports = mongoose.model("Advert", advertSchema);
