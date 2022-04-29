module.exports = {
	help: ()=> "Previews a server",
	usage: ()=> [" [id] - Previews server with a given ID"],
	execute: async (bot, msg, args)=> {
		if(!args[0]) return "Please provide a server ID to preview";
		let guild = await bot.stores.servers.get(msg.guild.id, args[0]);
		if(!guild) return "Server not found!";

		var contacts;
		if(!guild.contact_id || !guild.contact_id[0]) contacts = "(no contact provided)";
		else {
			var dat = await bot.utils.verifyUsers(bot, guild.contact_id);
			contacts = dat.info.map(user => `${user.mention} (${user.username}#${user.discriminator})`).join("\n");
		}

		var embed = bot.utils.serverEmbed({guild, contacts});

		return {embed};
	},
	permissions: ["manageMessages"],
	guildOnly: true
}