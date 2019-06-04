module.exports = {
	genEmbeds: async (arr, genFunc, info = {})=> {
		return new Promise(res => {
			var embeds = [];
			var current = { embed: {
				title: info.title,
				description: info.description,
				fields: []
			}};
			
			for(let i=0; i<arr.length; i++) {
				if(current.embed.fields.length < 10) {
					current.embed.fields.push(genFunc(arr[i]));
				} else {
					embeds.push(current);
					current = { embed: {
						title: info.title,
						description: info.description,
						fields: [genFunc(arr[i])]
					}};
				}
			}
			embeds.push(current);
			if(embeds.length > 1) {
				for(let i = 0; i < embeds.length; i++)
					embeds[i].embed.title += ` (page ${i+1}/${embeds.length}, ${arr.length} total)`;
			}
			res(embeds);
		})
	},
	getServer: async (bot, id)=> {
		return new Promise((res)=>{
			bot.db.query(`SELECT * FROM servers WHERE server_id=?`,[id],(err,rows)=>{
				if(err) {
						console.log(err);
						res(undefined)
					} else {
						res(rows[0]);
					}
			})
		})
	},
	getServersWithContact: async (bot, id)=> {
		return new Promise((res)=>{
			bot.db.query(`SELECT * FROM servers WHERE contact_id LIKE ?`,["%"+id+"%"],(err,rows)=>{
				if(err) {
						console.log(err);
						res(undefined)
					} else {
						res(rows);
					}
			})
		})
	},
	updateServer: async (bot, id, prop, val)=> {
		return new Promise(res=>{
			switch(prop) {
				case 'name':
					bot.db.query(`UPDATE servers SET name=? WHERE server_id=?`, [val, id], (err, rows)=>{
						if(err) {
							console.log(err);
							res(false);
						} else {
							res(true);
						}
					});
					break;
				case 'description':
					bot.db.query(`UPDATE servers SET description=? WHERE server_id=?`, [val, id], (err, rows)=>{
						if(err) {
							console.log(err);
							res(false);
						} else {
							res(true);
						}
					});
					break;
				case 'icon':
					bot.db.query(`UPDATE servers SET pic_url=? WHERE server_id=?`, [val, id], (err, rows)=>{
						if(err) {
							console.log(err);
							res(false);
						} else {
							res(true);
						}
					});
					break;
				case 'invite':
					bot.db.query(`UPDATE servers SET invite=? WHERE server_id=?`, [val, id], (err, rows)=>{
						if(err) {
							console.log(err);
							res(false);
						} else {
							res(true);
						}
					});
					break;
			}
		})
	},
	updatePosts: async (bot, id) => {
		return new Promise(async res=> {
			var guild = await bot.utils.getServer(bot, id)
			if(!guild) {
				console.log('Guild not found')
				res(false);
				return;
			}
			bot.db.query(`SELECT * FROM posts WHERE server_id=?`,[guild.id], async (err, rows)=>{
				if(err) {
					console.log(err);
					res(false);
				} else {
					if(!rows[0]) res(true);
					await Promise.all(rows.map(async p => {
						var dat = guild.contact_id == undefined || guild.contact_id == "" ? "" : await bot.utils.verifyUsers(bot, guild.contact_id.split(" "));
						var contacts = dat.info ? dat.info.map(user => `${user.mention} (${user.username}#${user.discriminator})`).join("\n") : "(no contact provided)";

						await bot.editMessage(p.channel_id, p.message_id, {embed: {
							title: guild.name || "(unnamed)",
							description: guild.description || "(no description provided)",
							fields: [
								{name: "Contact", value: contacts},
								{name: "Link", value: guild.invite ? guild.invite : "(no link provided)"}
							],
							thumbnail: {
								url: guild.pic_url || ""
							}
						}}).then(() => {
							return new Promise(res2 => {setTimeout(()=>res2(1), 100)})
						}).catch(e => {
							console.log(e);
							return new Promise(res2 => {setTimeout(()=>res2(0), 100)})
						});
					})).then(()=> {
						res(true)
					}).catch(e => {
						console.log(e);
						res(false);
					})
				}
			})
		})
	},
	getPosts: async (bot, id, chanid) => {
		return new Promise(res => {
			bot.db.query(`SELECT * FROM posts WHERE server_id=? AND channel_id=?`,[id, chanid], (err, rows)=> {
				if(err) {
					console.log(err);
					res(false);
				} else {
					res(rows);
				}
			})
		})
	},
	deletePosts: async (bot, id) => {
		return new Promise(async res=> {
			var guild = await bot.utils.getServer(bot, id)
			if(!guild) {
				console.log('Guild not found')
				res(false);
			}
			bot.db.query(`SELECT * FROM posts WHERE server_id=?`,[guild.id], async (err, rows)=>{
				if(err) {
					console.log(err);
					res(false);
				} else {
					await Promise.all(rows.map(async p => {
						await bot.deleteMessage(p.channel_id, p.message_id).then(() => {
							return new Promise(res2 => {setTimeout(()=>res2(1), 100)})
						}).catch(e => {
							console.log(e);
							return new Promise(res2 => {setTimeout(()=>res2(0), 100)})
						});
					})).then(()=> {
						res(true)
					}).catch(e => {
						console.log(e);
						res(false);
					})
				}
			})
		})
	},
	deletePost: async (bot, id) => {
		return new Promise(res => {
			bot.db.query(`DELETE FROM posts WHERE message_id=?`,[id],(err, rows)=> {
				if(err) {
					console.log(err);
					res(false);
				} else {
					res(true);
				}
			})
		})
	},
	deleteServer: async (bot, id) => {
		return new Promise(res => {
			bot.db.query('DELETE FROM servers WHERE id=?',[id],(err,rows)=>{
				if(err) {
					cosole.log(err);
					res(false)
				} else {
					bot.db.query('DELETE FROM posts WHERE server_id=?',[id],(err,rows)=>{
						if(err) {
							cosole.log(err);
							res(false)
						} else {
							res(true)
						}
					})
				}
			})
		})
	},
	verifyUsers: async (bot, ids) => {
		return new Promise(async res=>{
			var results = {
				pass: [],
				fail: [],
				info: []
			};
			console.log(results)
			await Promise.all(ids.map(async id => {
				console.log(id)
				var user;
				try {
					user = await bot.getRESTUser(id);
					if(user) {
						results.pass.push(id);
						results.info.push(user);
					}
				} catch(e) {
					results.fail.push(id);
				}
			})).then(()=> {
				res(results);
			})
		})
	},
	getConfig: async (bot, id)=> {
		return new Promise(res=>{
			bot.db.query(`SELECT * FROM configs WHERE server_id=?`,[id], (err,rows)=>{
				if(err) {
					console.log(err);
					res(false);
				} else {
					res(rows[0]);
				}
			})
		})
	}
}