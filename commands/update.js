module.exports = {
	help: ()=> "Updates a server's info using an invite",
	usage: ()=> [" [invite] - Updates the server that the invite belongs to (NOTE: use a new invite to replace the existing one"],
	execute: async (bot, msg, args) => {
		let id = args[0].match(/(?:.*)+\/(.*)$/) ?
				 args[0].match(/(?:.*)+\/(.*)$/)[1] :
				 args[0];
		let invite;
		let guild;
		await bot.getInvite(id).then(async inv=>{
			invite = inv;
			var guild = await bot.utils.getServer(bot, invite.guild.id);
			if(!guild) return msg.channel.createMessage("Server not fund");
			bot.db.query(`UPDATE servers SET ? WHERE server_id=?`,[{
				name: 		invite.guild.name, 
				invite: 	"https://discord.gg/"+invite.code,
				pic_url: 	`https://cdn.discordapp.com/icons/${invite.guild.id}/${invite.guild.icon}.jpg?size=128`
			}, invite.guild.id]);
			
			var res = await bot.utils.updatePosts(bot, invite.guild.id);
			if(!res) {
				msg.channel.createMessage('Something went wrong while updating post')
			} else {
				msg.channel.createMessage('Server updated!')
			}

		}).catch(e=>{
			console.log(e);
			msg.channel.createMessage("That invite is not valid or there was an error.")
		});
	}
}