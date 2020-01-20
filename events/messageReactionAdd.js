module.exports = async (msg, emoji, user, bot) => {
	if(bot.user.id == user) return;
	if(!msg.reactions) { //if message isn't cached
		try {
			msg = await bot.getMessage(msg.channel.id, msg.id);
		} catch(e) {
			console.log(e);
			return;
		}
	}

	if(bot.menus && bot.menus[msg.id] && bot.menus[msg.id].user == user) {
		try {
			await bot.menus[msg.id].execute(bot, msg, emoji);
		} catch(e) {
			console.log(e);
			writeLog(e);
			msg.channel.createMessage("Something went wrong: "+e.message);
		}
	}

	if(!msg.channel.guild) return;

	var cfg = await bot.utils.getConfig(bot, msg.channel.guild.id);
	if(cfg && cfg.blacklist && cfg.blacklist.includes(user)) {
		msg.removeReaction(emoji.name, user);
		return;
	}

	if(emoji.id) emoji.name = `:${emoji.name}:${emoji.id}`;

	await bot.utils.handleStarboardReactions(bot, msg, emoji, user);

	await bot.utils.handleSyncReactions(bot, msg, emoji, user);

	await bot.utils.handleReactPostReactions(bot, msg, emoji, user);

	await bot.utils.handleBanReactions(bot, msg, emoji, user);

	await bot.utils.handleTicketReactions(bot, msg, emoji, user);
}