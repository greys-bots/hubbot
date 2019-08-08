module.exports = {
	genEmbeds: async (bot, arr, genFunc, info = {}) => {
		return new Promise(async res => {
			var embeds = [];
			var current = { embed: {
				title: info.title,
				description: info.description,
				fields: []
			}};
			
			for(let i=0; i<arr.length; i++) {
				if(current.embed.fields.length < 10) {
					current.embed.fields.push(await genFunc(arr[i], bot));
				} else {
					embeds.push(current);
					current = { embed: {
						title: info.title,
						description: info.description,
						fields: [await genFunc(arr[i], bot)]
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
	genCode: (table, num = 4) =>{
		var codestring="";
		var codenum=0;
		while (codenum<num){
			codestring=codestring+table[Math.floor(Math.random() * (table.length))];
			codenum=codenum+1;
		}
		return codestring;
	},
	getServer: async (bot, id) => {
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
	getServerByRowID: async (bot, id) => {
		return new Promise((res)=>{
			bot.db.query(`SELECT * FROM servers WHERE id=?`,[id],(err,rows)=>{
				if(err) {
						console.log(err);
						res(undefined)
					} else {
						res(rows[0]);
					}
			})
		})
	},
	getServersWithContact: async (bot, id) => {
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
	getAllPosts: async (bot) => {
		return new Promise(async res => {
			var posts = [];
			bot.db.query(`SELECT * FROM posts`, async (err, rows)=> {
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
							},
							color: 3447003,
							footer: {
								text: `ID: ${guild.server_id}`
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
	},
	getReactionRoles: async (bot, id) => {
		return new Promise(res => {
			bot.db.query(`SELECT * FROM reactroles WHERE server_id=?`,[id],(err, rows)=>{
				if(err) {
					console.log(err);
					res(undefined);
				} else {
					res(rows);
				}
			})
		})
	},
	getReactionRolesByCategory: async (bot, serverid, categoryid) => {
		return new Promise(res => {
			bot.db.query(`SELECT * FROM reactcategories WHERE server_id=? AND hid=?`,[serverid, categoryid], {
				id: Number,
				hid: String,
				server_id: String,
				name: String,
				description: String,
				roles: JSON.parse
			}, async (err, rows)=>{
				if(err) {
					console.log(err);
					res(undefined);
				} else {
					if(rows[0].roles) {
						var roles = [];
						await Promise.all(rows[0].roles.map((r,i) => {
							return new Promise(res2 => {
								bot.db.query(`SELECT * FROM reactroles WHERE id=?`,[r], (err, rls)=> {
									console.log(rls[0]);
									roles[i] = rls[0]
								});
								setTimeout(()=> res2(''), 100)
							})
						})).then(()=> {
							console.log(roles);
							res(roles)
						})
					} else {
						res(undefined);
					}

				}
			})
		})
	},
	getReactionRoleByReaction: async (bot, id, emoji, postid) => {
		return new Promise(res => {
			bot.db.query(`SELECT * FROM reactroles WHERE server_id=? AND emoji=? AND post_id=?`,[id, emoji, postid],(err, rows)=>{
				if(err) {
					console.log(err);
					res(undefined);
				} else {
					res(rows[0]);
				}
			})
		})
	},
	getReactionRolePost: async (bot, id, postid) => {
		return new Promise(res => {
			bot.db.query(`SELECT * FROM reactposts WHERE server_id=? AND message_id=?`,[id, postid],{
				id: Number,
				server_id: String,
				channel_id: String,
				message_id: String,
				category_id: String,
				roles: JSON.parse
			},(err, rows)=>{
				if(err) {
					console.log(err);
					res(undefined);
				} else {
					res(rows[0]);
				}
			})
		})
	},
	getReactionRole: async (bot, id, role) => {
		return new Promise(res => {
			bot.db.query(`SELECT * FROM reactroles WHERE server_id=? AND role_id=?`,[id, role],(err, rows)=>{
				if(err) {
					console.log(err);
					res(undefined);
				} else {
					res(rows[0]);
				}
			})
		})
	},
	updateReactRolePost: async (bot, msg, roles) => {
		bot.editMessage(msg.channel.id, msg.id, {
			embed: {
				title: "Server Reaction Roles",
				description: "All available roles for the server",
				fields: roles.map(r => {
					var rl = msg.guild.roles.find(x => x.id == r.role_id);
					 if(rl) {
					 	return {name: `${rl.name} (${r.emoji.includes(":") ? `<${r.emoji}>` : r.emoji})`, value: r.description || "*(no description provided)*"}
					 } else {
					 	return null
					 }
				}).filter(x => x!=null)
			}
		}).then(message => {
			var reacts = roles.map(r => r.emoji);
			reacts.forEach(rc => message.addReaction(rc));
		})

		var post = await bot.utils.getReactionRolePost(bot, msg.channel.guild.id, msg.id);
		if(post) {
			bot.db.query(`UPDATE reactposts SET roles=? WHERE server_id=? AND channel_id=? AND message_id=?`,[roles.map(r => {return {emoji: r.emoji, role_id: r.role_id}})])
		} else {
			bot.db.query(`INSERT INTO reactposts (server_id, channel_id, message_id, roles) VALUES (?,?,?,?)`, [
				msg.guild.id,
				msg.channel.id,
				msg.id,
				roles.map(r => { return {emoji: r.emoji, role_id: r.role_id} })
			])
		}
	},
	getReactionCategories: async (bot, id) => {
		return new Promise(res => {
			bot.db.query(`SELECT * FROM reactcategories WHERE server_id=?`,[id], {
				id: Number,
				hid: String,
				server_id: String,
				name: String,
				description: String,
				roles: JSON.parse
			}, (err, rows)=>{
				if(err) {
					console.log(err);
					res(undefined);
				} else {
					res(rows);
				}
			})
		})
	},
	getReactionCategory: async (bot, id, categoryid) => {
		return new Promise(res => {
			bot.db.query(`SELECT * FROM reactcategories WHERE server_id=? AND hid=?`,[id, categoryid], {
				id: Number,
				hid: String,
				server_id: String,
				name: String,
				description: String,
				roles: JSON.parse
			}, (err, rows)=>{
				if(err) {
					console.log(err);
					res(undefined);
				} else {
					res(rows[0]);
				}
			})
		})
	},
	deleteReactionCategory: async (bot, id, categoryid) => {
		return new Promise(res => {
			bot.db.query(`DELETE FROM reactcategories WHERE server_id=? AND hid=?`,[id, categoryid]);
			bot.db.query(`SELECT * FROM reactposts WHERE server_id=? AND category_id=?`,[id, categoryid], (err, rows) => {
				if(err) {
					console.log(err);
					res(false);
				} else {
					rows.forEach(p => {
						try {
							bot.deleteMessage(p.channel_id, p.message_id);
						} catch(e) {
							console.log(e)
						}
					})
				}
			})
			bot.db.query(`DELETE FROM reactposts WHERE server_id=? AND category_id=?`,[id, categoryid]);
			bot.db.query(`UPDATE reactroles SET category=? WHERE server_id=? AND category=?`,[categoryid, id, categoryid]);
			res(true);
		})
	},
	updateReactCategoryPost: async (bot, id, msg, categoryid) => {
		return new Promise(async res => {
			var cat = await bot.utils.getReactionCategory(bot, id, categoryid);
			if(!cat) return res(true);
			var roles = await bot.utils.getReactionRolesByCategory(bot, id, categoryid);
			if(!roles || roles.length == 0 || !roles.find(r => r.post_id)) return res(false);
			var pst = roles.find(r => r.post_id);
			await bot.editMessage(pst.post_channel, pst.post_id, {embed: {
				title: "Server Reaction Roles",
				description: "All available roles for the server",
				fields: roles.map(r => {
					var rl = msg.guild.roles.find(x => x.id == r.role_id);
					return {name: `${rl.name} (${r.emoji.includes(":") ? `<${r.emoji}>` : r.emoji})`, value: r.description || "*(no description provided)*"}
				})
			}}).then(message => {	
				console.log(message.reactions);			
				var emoji = roles.map(r => r.emoji);
				var oldreacts = Object.keys(message.reactions)
								.filter(rr => message.reactions[rr].me)
								.filter(rr => !emoji.includes(rr) && !emoji.includes(":"+rr));
				emoji.forEach(rc => message.addReaction(rc));
				oldreacts.forEach(rc => message.removeReaction(rc.replace(/^:/,"")));

				bot.db.query(`UPDATE reactroles SET post_channel = ?, post_id = ? WHERE server_id = ? AND category=?`,[
					message.channel.id,
					message.id,
					message.guild.id,
					cat.id
				], (err, rows)=> {
					if(err) console.log(err);
				})
				res(true);
			}).catch(e => {
				console.log(e);
				res(false)
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
	}
}