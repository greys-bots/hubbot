module.exports = async (guild, bot) => {
	try {
		var data = await bot.utils.getExportData(bot, guild.id);
		var ch = await bot.getDMChannel(guild.ownerID);
		if(!ch) return;
		ch.createMessage(["Hi! I'm sending you this because you removed me from your server. ",
			"After 24 hours, all the data I have indexed for it will be deleted. ",
			"If you invite me back after 24 hours are up and would like to start up ",
			"where you left off, you can use this file to do so!",
			"\nNOTE: Support tickets and feedback tickets WILL NOT BE SAVED.",
			" These are too complex/abusable to export and import,", 
			" and thus will be deleted once the 24 hours are up."].join(""),
			[{file: Buffer.from(JSON.stringify(data)), name: "hub_data.json"}]);
	} catch(e) {
		console.log("Error attempting to export/deliver data after being kicked:\n"+e.stack)
	}

	setTimeout(async ()=> {
		var scc = await bot.utils.deleteAllData(bot, guild.id);
		if(!scc && bot.log_channel) bot.createMessage(bot.log_channel, "Could not delete all data for guild ID "+guild.id+" from the database");
		else if(!scc) console.log("Could not delete all data for guild ID "+guild.id+" from the database");
	}, 24*60*60*1000)
}