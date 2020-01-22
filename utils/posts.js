module.exports = {
	getAllPosts: async (bot, host) => {
		return new Promise(async res => {
			var posts = [];
			bot.db.query(`SELECT * FROM posts WHERE host_id=?`,[host], async (err, rows)=> {
				if(err) {
					console.log(err);
					res(undefined)
				} else {
					for(var i = 0; i < rows.length; i++) {
						var s = await bot.utils.getServerByRowID(bot, rows[i].server_id);
						if(s) posts.push({server_id: s.server_id, name: s.name, channel_id: rows[i].channel_id, message_id: rows[i].message_id});
						else  posts.push({server_id: rows[i].server_id, channel_id: rows[i].channel_id, message_id: rows[i].message_id});
					}

					res(posts);
				}
			});

		})
	},
	getPosts: async (bot, host, id, chanid) => {
		return new Promise(res => {
			bot.db.query(`SELECT * FROM posts WHERE host_id=? AND server_id=? AND channel_id=?`,[host, id, chanid], (err, rows)=> {
				if(err) {
					console.log(err);
					res(false);
				} else {
					res(rows);
				}
			})
		})
	},
	getPostsByServer: async (bot, id) => {
		return new Promise(async res => {
			var guild = await bot.utils.getServerByID(bot, id);
			if(!guild) return res(undefined);
			bot.db.query(`SELECT * FROM posts WHERE server_id = ?`,[guild.id], (err, rows) => {
				if(err) {
					console.log(err);
					res(undefined);
				} else {
					res(rows);
				}
			})
		})
	},
	updatePosts: async (bot, host, id) => {
		return new Promise(async res=> {
			var guild = await bot.utils.getServer(bot, host, id)
			if(!guild) {
				console.log('Guild not found')
				res(false);
				return;
			}
			var posts = await bot.utils.getPostsByServer(bot, id);
			if(!posts || !posts[0]) res(true);
			var dat = guild.contact_id == undefined || guild.contact_id == "" ? "" : await bot.utils.verifyUsers(bot, guild.contact_id.split(" "));
			var contacts = dat.info ? dat.info.map(user => `${user.mention} (${user.username}#${user.discriminator})`).join("\n") : "(no contact provided)";
			for(var i = 0; i < posts.length; i++) {
				try {
					await bot.editMessage(posts[i].channel_id, posts[i].message_id, {embed: {
						title: guild.name || "(unnamed)",
						description: guild.description || "(no description provided)",
						fields: [
							{name: "Contact", value: contacts},
							{name: "Link", value: guild.invite ? guild.invite : "(no link provided)", inline: true},
							{name: "Members", value: bot.guilds.find(g => g.id == guild.server_id) ? bot.guilds.find(g => g.id == guild.server_id).memberCount : "(unavailable)"}
						],
						thumbnail: {
							url: guild.pic_url || ""
						},
						color: 3447003,
						footer: {
							text: `ID: ${guild.server_id}`
						}
					}})
				} catch(e) {
					console.log(e);
					if(e.message.includes("Unknown Message")) await bot.utils.deletePost(bot, host, posts[i].message_id);
				}
				
			}
			res(true);
		})
	},
	updatePostsByServer: async (bot, id) => {
		return new Promise(async res=> {
			var guild = await bot.utils.getServerByID(bot, id)
			if(!guild) {
				console.log('Guild not found')
				res(false);
				return;
			}
			var posts = await bot.utils.getPostsByServer(bot, id);
			if(!posts || !posts[0]) res(true);
			var dat = guild.contact_id == undefined || guild.contact_id == "" ? "" : await bot.utils.verifyUsers(bot, guild.contact_id.split(" "));
			var contacts = dat.info ? dat.info.map(user => `${user.mention} (${user.username}#${user.discriminator})`).join("\n") : "(no contact provided)";
			for(var i = 0; i < posts.length; i++) {
				try {
					await bot.editMessage(posts[i].channel_id, posts[i].message_id, {embed: {
						title: guild.name || "(unnamed)",
						description: guild.description || "(no description provided)",
						fields: [
							{name: "Contact", value: contacts},
							{name: "Link", value: guild.invite ? guild.invite : "(no link provided)", inline: true},
							{name: "Members", value: bot.guilds.find(g => g.id == guild.server_id) ? bot.guilds.find(g => g.id == guild.server_id).memberCount : "(unavailable)"}
						],
						thumbnail: {
							url: guild.pic_url || ""
						},
						color: 3447003,
						footer: {
							text: `ID: ${guild.server_id}`
						}
					}})
				} catch(e) {
					console.log(e);
					if(e.message.includes("Unknown Message") || e.message.includes("Unknown Channel")) 
						await bot.utils.deletePost(bot, posts[i].host_id, posts[i].message_id);
				}
			}

			res(true);
		})
	},
	deleteAllPosts: async (bot, host) => {
		return new Promise(async res=> {
			bot.db.query(`SELECT * FROM posts WHERE host_id=?`,[host], async (err, rows)=>{
				if(err) {
					console.log(err);
					res(false);
				} else {
					res(true)
				}
			})
		})
	},
	deletePosts: async (bot, host, id) => {
		return new Promise(async res=> {
			var guild = await bot.utils.getServer(bot, host, id)
			if(!guild) {
				console.log('Guild not found')
				res(false);
			}
			bot.db.query(`SELECT * FROM posts WHERE host_id=? AND server_id=?`,[host, guild.id], async (err, rows)=>{
				if(err) {
					console.log(err);
					res(false);
				} else {
					for(var i = 0; i < rows.length; i++) {
						try {
							await bot.deleteMessage(rows[i].channel_id, rows[i].message_id)
						} catch(e) {
							console.log(e);
							return res(false);
						}
					}

					res(true);
				}
			})
		})
	},
	deletePost: async (bot, host, id) => {
		return new Promise(res => {
			bot.db.query(`DELETE FROM posts WHERE host_id = ? AND message_id=?`,[host, id],(err, rows)=> {
				if(err) {
					console.log(err);
					res(false);
				} else {
					res(true);
				}
			})
		})
	}
}