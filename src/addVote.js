const cron = require("node-cron");
const axios = require("axios");
// works every 3 seconds
const add = async () => {
  try {
    const res = await axios.post("https://webhook.markaz24.ru/add-vote", {});
    console.log("Vote added", res.data);
  } catch (e) {
    console.error(e.message);
  }
};
cron.schedule("*/1 * * * * *", add);
// add();
