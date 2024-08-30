const addTempAdTitle = async (ctx) => {
  try {
    const { message, edited_message } = ctx.update;
    let tempAdTitle = message?.text?.trim() || edited_message?.text?.trim();

    if (!tempAdTitle) {
      return await ctx.reply("Илтимос реклама номини юборинг");
    }

    ctx.session = ctx.session || {};
    ctx.session.tempAdTitle = tempAdTitle;

    return;
  } catch (error) {
    console.error("Error:", { error });
    await ctx.reply("Хатолик. Кайтадан уриниб кўринг");
  }
};

module.exports = addTempAdTitle;
