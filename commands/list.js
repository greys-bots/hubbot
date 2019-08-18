module.exports = {
	help: ()=> "Lists all servers.",
	usage: ()=> [" - Lists every server indexed so far"],
	execute: async (bot, msg, args)=>{
		bot.db.query(`SELECT * FROM servers WHERE host_id=?`,[msg.guild.id],async (err, rows)=>{
			if(err) {
				console.log(err);
				msg.channel.createMessage('There was an error!');
			} else {
				if(rows) {
					if(rows.length > 10) {
						var embeds = await bot.utils.genEmbeds(bot, rows, async dat => {
							return {name: dat.name || "(unnamed)", value: dat.server_id}
						}, {
							title: "Servers",
							description: "Currently indexed servers"
						});
						msg.channel.createMessage(embeds[0]).then(message => {
							if(!bot.pages) bot.pages = {};
							bot.pages[message.id] = {
								user: msg.author.id,
								index: 0,
								data: embeds
							};
							message.addReaction("\u2b05");
							message.addReaction("\u27a1");
							message.addReaction("\u23f9");
							setTimeout(()=> {
								if(!bot.pages[message.id]) return;
								message.removeReaction("\u2b05");
								message.removeReaction("\u27a1");
								message.removeReaction("\u23f9");
								delete bot.pages[msg.author.id];
							}, 900000)
						})
						
					} else {
						msg.channel.createMessage({ embed: {
							title: "Servers",
							description: "Currently indexed servers",
							fields: rows.map(s => {
								return {name: s.name || "(unnamed)", value: s.server_id}
							})
						}})
					}
				} else {
					msg.channel.createMessage('None!');
				}
			}
		})
	},
	permissions: ["manageMessages"]
}