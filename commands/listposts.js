module.exports = {
	help: ()=> "Lists all posts in the database",
	usage: ()=> [" - Lists all posts the database has, for debug reasons"],
	execute: async (bot, msg, args) => {
		bot.db.query(`SELECT * FROM posts`,async (err, rows)=> {
			if(err) {
				console.log(err);
				msg.channel.createMessage("Something went wrong");
			} else {
				if(rows) {
					if(rows.length > 10) {
						var embeds = await bot.utils.genEmbeds(rows, dat => {
							return {name: dat.server_id, value: `Channel ID: ${dat.channel_id}\nMessage ID: ${dat.message_id}`}
						}, {
							title: "Posts",
							description: "Currently indexed posts\nNOTE: server_id references id in servers table, not actual server ID"
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
							title: "Posts",
							description: "Currently indexed posts\nNOTE: server_id references id in servers table, not actual server ID",
							fields: rows.map(s => {
								return {name: s.server_id, value: `Channel ID: ${s.channel_id}\nMessage ID: ${s.message_id}`}
							})
						}})
					}
				} else {
					msg.channel.createMessage('None!');
				}
			}
		})
	}
}