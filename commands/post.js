module.exports = {
	help: ()=> "Posts server embed in a given channel",
	usage: ()=> [' [channel] - Posts server in channel (NOTE: can be channel ID, name, or #mention)'],
	execute: async (bot, msg, args)=> {
		var guild = await bot.utils.getServer(bot, args[0]);
		if(!guild) return msg.channel.createMessage('Server not found.');
		var chan = msg.channelMentions.length > 0 ?
				   msg.guild.channels.find(ch => ch.id == msg.channelMentions[0]) :
				   msg.guild.channels.find(ch => ch.id == args[1] || ch.name == args[1]);

		if(!chan) return msg.channel.createMessage('Channel not found');

		var dat = guild.contact_id == undefined || guild.contact_id == "" ? "" : await bot.utils.verifyUsers(bot, guild.contact_id.split(" "));

		var contacts = dat.info ? dat.info.map(user => `${user.mention} (${user.username}#${user.discriminator})`).join("\n") : "(no contact provided)";

		chan.createMessage({embed: {
			title: guild.name || "(unnamed)",
			description: guild.description || "(no description provided)",
			fields: [
				{name: "Contact", value: contacts},
				{name: "Link", value: guild.invite ? guild.invite : "(no link provided)"}
			],
			thumbnail: {
				url: guild.pic_url || ""
			}
		}}).then(message => {
			bot.db.query(`INSERT INTO posts SET ?`,{
				server_id: guild.id,
				channel_id: chan.id,
				message_id: message.id
			})
		})

	}
}