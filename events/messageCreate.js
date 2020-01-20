module.exports = async (msg, bot) => {
	if(msg.author.bot) return;

	var prefix = new RegExp("^"+bot.prefix, "i");
	if(!msg.content.toLowerCase().match(prefix)) return;
	let args = msg.content.replace(prefix, "").split(" ");
	let {command, nargs} = await bot.parseCommand(bot, msg, args);
	if(!command) ({command, nargs} = await bot.parseCustomCommand(bot, msg, args));
	if(command) {

		var cfg = msg.guild ? await bot.utils.getConfig(bot, msg.guild.id) : {};
		if(cfg && cfg.blacklist && cfg.blacklist.includes(msg.author.id)) return msg.channel.createMessage("You have been banned from using this bot.");
		if(!command.permissions || (command.permissions && command.permissions.filter(p => msg.member.permission.has(p)).length == command.permissions.length)) {
			command.execute(bot, msg, nargs, command);
		} else {
			msg.channel.createMessage("You do do not have permission to do this.")
		}
		
	} else msg.channel.createMessage("Command not found.");
}