module.exports = {
	getSyncConfig: async (bot, server) => {
		return new Promise(res => {
			bot.db.query(`SELECT * FROM sync WHERE server_id = ?`,[server], {
				id: Number,
				server_id: String,
				sync_id: String,
				confirmed: Boolean,
				syncable: Boolean,
				sync_notifs: String,
				ban_notifs: String,
				enabled: Boolean
			}, (err, rows) => {
				if(err) {
					console.log(err);
					res(undefined);
				} else res(rows[0])
			})
		})
	},
	updateSyncConfig: async (bot, server, data) => {
		return new Promise(async res => {
			var cfg = await bot.utils.getSyncConfig(bot, server);
			if(!cfg) {
				bot.db.query(`INSERT INTO sync 
							 (server_id, sync_id, confirmed, syncable, sync_notifs, ban_notifs, enabled) VALUES 
							 (?,?,?,?,?,?,?)`,
							 [server, data.sync_id || "", data.confirmed || 0,  data.syncable || 0,
							 data.sync_notifs || "", data.ban_notifs || "", data.enabled || 1], (err, rows)=> {
					if(err) {
						console.log(err);
						res(false)
					} else {
						res(true)
					}
				}) 
			} else {
				bot.db.query(`UPDATE sync SET ${Object.keys(data).map((k) => k+"=?").join(",")} WHERE server_id=?`,[...Object.values(data), server], (err, rows)=> {
					if(err) {
						console.log(err);
						res(false)
					} else {
						res(true)
					}
				})
			}
		})
	},
	addSyncMenu: async (bot, server, channel, message, type, rserver, rchannel) => {
		return new Promise(res => {
			bot.db.query(`INSERT INTO sync_menus (server_id, channel_id, message_id, type, reply_guild, reply_channel)
						  VALUES (?,?,?,?,?,?)`,
						  [server, channel, message, type, rserver, rchannel],
			(err, rows) => {
				if(err) {
					console.log(err);
					res(false);
				} else res(true);
		  })
		})
	},
	getSyncMenu: async (bot, server, channel, message) => {
		return new Promise(res => {
			bot.db.query(`SELECT * FROM sync_menus WHERE server_id = ? AND channel_id = ? AND message_id = ?`,[server, channel, message], {
				id: Number,
				server_id: String,
				channel_id: String,
				message_id: String,
				type: Number,
				reply_guild: String,
				reply_channel: String
			}, (err, rows) => {
				if(err) {
					console.log(err);
					res(undefined);
				} else res(rows[0])
			})
		})
	},
	getSyncRequest: async (bot, server, requester) => {
		var scfg = await bot.utils.getSyncConfig(bot, requester);
		if(!scfg || !scfg.sync_id || scfg.sync_id != server) return Promise.resolve(undefined);
		return new Promise(res => {
			bot.db.query(`SELECT * FROM sync_menus WHERE server_id = ? AND reply_guild = ?`,[server, requester], {
				id: Number,
				server_id: String,
				channel_id: String,
				message_id: String,
				type: Number,
				reply_guild: String,
				reply_channel: String
			}, (err, rows) => {
				if(err) {
					console.log(err);
					res(undefined);
				} else {
					if(rows[0]) res({channel: rows[0].channel_id, message: rows[0].message_id,
									requester: rows[0].reply_guild, requester_channel: rows[0].reply_channel, confirmed: scfg.confirmed});
					else res({requester: scfg.server_id, requester_channel: scfg.sync_notifs, confirmed: scfg.confirmed});
				}
			})
		})
	},
	deleteSyncMenu: async (bot, server, channel, message) => {
		return new Promise(res => {
			bot.db.query(`DELETE FROM sync_menus WHERE server_id = ? AND channel_id = ? AND message_id = ?`,[server, channel, message], (err, rows) => {
				if(err) {
					console.log(err);
					res(false);
				} else res(true)
			})
		})
	},
	getSyncedServers: async (bot, server) => {
		return new Promise(res => {
			bot.db.query(`SELECT * FROM sync WHERE sync_id=? AND confirmed = ?`,[server, 1],async (err, rows)=> {
				if(err) {
					console.log(err);
					res(undefined);
				} else {
					if(rows[0]) {
						for(var i = 0; i < rows.length; i++) {
							var guild = bot.guilds.find(g => g.id == rows[i].server_id);
							if(guild) rows[i].guild = guild;
							else rows[i] = "deleted";
						}
						rows = rows.filter(x => x!="deleted");
						if(!rows || !rows[0]) res(undefined);
						else res(rows);
					} else res(undefined);
				}
			})
		})
	},
	unsyncServers: async (bot, server) => {
		return new Promise(res => {
			bot.db.query(`UPDATE sync SET sync_id=?, confirmed = ? WHERE sync_id = ?`,["", 0, server],async (err, rows)=> {
				if(err) {
					console.log(err);
					res(false);
				} else res(true);
			})
		})
	},
	handleSyncReactions: async (bot, msg, emoji, user) => {
		return new Promise(async res => {
			var smenu = await bot.utils.getSyncMenu(bot, msg.channel.guild.id, msg.channel.id, msg.id);
			if(!smenu) return;
			if(!["✅", "❌"].includes(emoji.name)) return;
			var request = await bot.utils.getSyncRequest(bot, msg.channel.guild.id, smenu.reply_guild);
			if(!request) return;
			if(msg) var embed = msg.embeds[0];
			var member = await bot.utils.fetchUser(bot, user);
			switch(emoji.name) {
				case "✅":
					if(request.confirmed) {
						try {
							await msg.removeReaction("✅", user);
						} catch(e) {
							console.log(e)
						}
						return;
					}

					try {
						if(embed) {
							embed.fields[2].value = "Confirmed";
							embed.color = parseInt("55aa55", 16);
							embed.author = {
								name: `Accepted by: ${member.username}#${member.discriminator} (${member.id})`,
								icon_url: member.avatarURL
							}
							await bot.editMessage(msg.channel.id, msg.id, {embed: embed});
							await msg.removeReactions();
						}
					} catch(e) {
						console.log(e);
						msg.channel.createMessage("Notification for this request couldn't be updated; the request can still be confirmed, however");
					}

					var scc = await bot.utils.updateSyncConfig(bot, smenu.reply_guild, {confirmed: true});
					if(scc) {
						try {
							await bot.createMessage(smenu.reply_channel, {embed: {
								title: "Sync Acceptance",
								description: `Your sync request with ${msg.guild.name} has been accepted!`,
								color: parseInt("55aa55", 16),
								timestamp: new Date().toISOString()
							}});
						} catch(e) {
							console.log(e);
							msg.channel.createMessage("Couldn't send the requester the acceptance notification; please make sure they're aware that their server was accepted and that they should use `hub!ban notifs [channel]` if they want ban notifications")
						}
					} else msg.channel.createMessage("Something went wrong while updating the request. Please try again");
					break;
				case "❌":
					if(!request.confirmed) {
						try {
							await msg.removeReaction("❌", user);
						} catch(e) {
							console.log(e)
						}
						return;
					}

					try {
						if(embed) {
							embed.fields[2].value = "Denied";
							embed.color = parseInt("aa5555", 16);
							embed.author = {
								name: `Denied by: ${member.username}#${member.discriminator} (${member.id})`,
								icon_url: member.avatarURL
							}
							await bot.editMessage(msg.channel.id, msg.id, {embed: embed});
							await msg.removeReactions();
							await bot.utils.deleteSyncMenu(bot, msg.channel.guild.id, msg.channel.id, msg.id);
						}
					} catch(e) {
						console.log(e);
						msg.channel.createMessage("Notification for this request couldn't be updated; the request can still be denied, however");
					}

					var scc = await bot.utils.updateSyncConfig(bot, smenu.reply_guild, {confirmed: true});
					if(scc) {
						try {
							await bot.createMessage(smenu.reply_channel, {embed: {
								title: "Sync Denial",
								description: `Your sync request with ${msg.guild.name} has been denied.${request.confirmed ? " You'll no longer receive notifications from this server." : ""}`,
								color: parseInt("aa5555", 16),
								timestamp: new Date().toISOString()
							}});
						} catch(e) {
							console.log(e);
							msg.channel.createMessage("Couldn't send the requester the acceptance notification; please make sure they're aware that their server was accepted")
						}
					} else msg.channel.createMessage("Something went wrong while updating the request. Please try again");
					break;
			}
		})
	}
}