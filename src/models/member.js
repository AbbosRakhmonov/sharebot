const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
  {
    _id: { type: Number, required: true, unique: true },
  },
  {
    timestamps: true,
    _id: false,
    versionKey: false,
  },
);

module.exports = mongoose.model("Member", memberSchema);
