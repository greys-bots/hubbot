module.exports = {
	help: ()=> "Deletes a server",
	usage: ()=> [" [serverID] - Deletes given server and all posts about it"],
	execute: async (bot, msg, args) => {
		var guild = await bot.utils.getServer(bot, args[0]);
		if(!guild) return msg.channel.createMessage('Server not found.');
		var res = await bot.utils.deletePosts(bot, args[0]);
		if(!res) return msg.channel.createMessage('Something went wrong while deleting posts.');

		var dat = await bot.utils.verifyUsers(bot, guild.contact_id.split(" "));
		var conf = await bot.utils.getConfig(bot, msg.guild.id);
		if(!conf) return;
		console.log(conf.reprole);
		if(!conf.reprole) return;
		await Promise.all(dat.pass.map(async m => {
			try {
				await msg.guild.removeMemberRole(m, conf.reprole)
				return new Promise(res => setTimeout(()=> res(1), 100))
			} catch(e) {
				console.log(e);
			}
		}))

		var res2 = await bot.utils.deleteServer(bot, guild.id);
		if(!res2) return msg.channel.createMessage('Something went wrong while deleting server.');

		msg.channel.createMessage('Server deleted!');
	}
}