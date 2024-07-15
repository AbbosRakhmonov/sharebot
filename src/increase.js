const Poll = require("./models/poll");
const mongoose = require("mongoose");

const increase = async (req, res) => {
  try {
    // add two votes to the option with the specified ID
    const result = await Poll.updateOne(
      {
        _id: new mongoose.Types.ObjectId("6683fdebb003948000c13e61"),
        "options._id": new mongoose.Types.ObjectId("6683fe04b003948000c13e70"),
      },
      {
        $inc: { "options.$.votes": 2 },
      },
    );

    res.status(200).json(result);
  } catch (e) {
    res.status(500).send("Server Error");
    console.error(e.message);
  }
};

module.exports = { increase };
