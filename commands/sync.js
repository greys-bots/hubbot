module.exports = {
	help: ()=> "Sync your server to another server",
	usage: ()=> [" - Shows your current config",
				 " [serverID] - Syncs your server with another server",
				 " setup - Sets up a config for your server",
				 " enable - Lets others sync to your server",
				 " disable - Stops allowing others to sync to your server",
				 " notifs [channel] - Sets the channel for sync notifications",
				 " accept [serverID] - Manually accepts a server's sync request",
				 " deny [serverID] - Manually denies a server's sync request. Can be used even after accepting a request",
				 " cancel - Cancels your current sync request, if you have one open"],
	desc: ()=> ["This command syncs your server with a host server, giving you ban updates (configured ",
				"with `hub!ban notifs [channel]`) and syncing your member count, server name, and server icon with your server's listings."].join(""),
	execute: async (bot, msg, args) => {
		var cfg = await bot.utils.getSyncConfig(bot, msg.guild.id) || {};
		if(args[0]) {
			if(!cfg.sync_notifs) return msg.channel.createMessage("Please configure a notifications channel before attempting to sync with another server");
			if(cfg.sync_id && !cfg.confirmed) return msg.channel.createMessage("You already have a pending sync request out. Please wait to change synced servers until after that request goes through");
			if(cfg.syncable) {
				await msg.channel.createMessage("WARNING: Syncing your guild with another guild will stop others from syncing with yours. Are you sure you want to do this? (y/n)");
				var resp;
				var resp = await msg.channel.awaitMessages(m => m.author.id == msg.author.id, {maxMatches: 1, time: 30000});
				if(!resp || !resp[0]) return msg.channel.createMessage("ERR: timed out. Aborting...");
				if(!["y","yes"].includes(resp[0].content.toLowerCase())) return msg.channel.createMessage("Action cancelled");
			}
			var guild;
			try {
				guild = await bot.getRESTGuild(args[0]);
			} catch(e) {
				console.log(e);
				return msg.channel.createMessage("Couldn't get that guild. Make sure it exists and that I'm in it");
			}
			var gcfg = await bot.utils.getSyncConfig(bot, guild.id);
			if(!gcfg || !gcfg.syncable || !gcfg.sync_notifs) return msg.channel.createMessage("That guild is not available to sync with");

			try {
				var message = await bot.createMessage(gcfg.sync_notifs, {embed: {
					title: "Sync Confirmation",
					description: [`User ${msg.author.username}#${msg.author.discriminator} (${msg.author.id}) `,
								  `from guild ${msg.guild.name} (${msg.guild.id}) has requested to sync with your server!\n`,
								  `React with :white_check_mark: to allow this, or :x: to deny it.`].join(""),
					footer: {
						text: `Requester ID: ${msg.guild.id}`
					},
					color: parseInt("5555aa",16)
				}})
			} catch(e) {
				console.log(e);
				return msg.channel.createMessage("Something went wrong when sending a confirmation to that guild. Please contact the guild's admins and make sure their `sync_notifs` channel exists and that I can message it");
			}
			try {
				["✅","❌"].forEach(r => message.addReaction(r));
			} catch(e) {
				//just couldn't add the reacts, should be fine to ignore, maybe let the server know though
				console.log(e);
				message.channel.createMessage("(Couldn't add the reactions- make sure I have the `addReactions` permission! Reactions from mods should still work, however)");
			}
			
			var scc = await bot.utils.addSyncMenu(bot, message.guild.id, message.channel.id, message.id, 0, msg.guild.id, cfg.sync_notifs);
			var scc2 = await bot.utils.updateSyncConfig(bot, msg.guild.id, {syncable: false, confirmed: false, sync_id: guild.id});

			if(scc && scc2) msg.channel.createMessage("Confirmation sent! You'll get a notification when they accept/deny it");
			else if(!scc && scc2) {
				msg.channel.createMessage("Something went wrong when inserting the confirmation into the database. This request can still be manually confirmed, however");
				await message.edit({embed: {
					title: "Sync Confirmation",
					description: [`User ${msg.author.username}#${msg.author.discriminator} (${msg.author.id}) `,
								  `from guild ${msg.guild.name} (${msg.guild.id}) has requested to sync with your server!\n`,
								  `Use \`hub!sync accept ${msg.guild.id}\` to accept it or \`hub!sync deny ${msg.guild.id}\` to deny it.`].join(""),
					footer: {
						text: `Requester ID: ${msg.guild.id}`
					}
				}})
			} else if(scc && !scc2) msg.channel.createMessage("Couldn't update your sync config. This request can still be confirmed, however");
			else {
				msg.channel.createMessage("Couldn't add the sync menu or update your sync config, thus this sync attempt cannot be completed. Please try again");
				await message.edit({embed: {
					title: "Sync Confirmation",
					description: [`User ${msg.author.username}#${msg.author.discriminator} (${msg.author.id}) `,
								  `from guild ${msg.guild.name} (${msg.guild.id}) has requested to sync with your server!\n`,
								  `UPDATE: Something went wrong when handling this sync request. This request cannot be accepted or denied.`].join(""),
					footer: {
						text: `Requester ID: ${msg.guild.id}`
					}
				}})
			}
		} else {
			await msg.channel.createMessage({embed: {
				title: "Sync Config",
				fields: [
					{name: "Syncable?", value: `${cfg.syncable ? "Yes" : "No"}`},
					{name: "Synced Server", value: `${cfg.sync_id ? cfg.sync_id + (cfg.confirmed ? " (confirmed)" : " (unconfirmed)") : "Nothing"}`},
					{name: "Sync Notifs Channel", value: `${cfg.sync_notifs ? (msg.guild.channels.find(ch => ch.id == cfg.sync_notifs) ? msg.guild.channels.find(ch => ch.id == cfg.sync_notifs).name : "Invalid channel! Please set again") : "Not set"}`},
					{name: "Ban Notifs Channel", value: `${cfg.ban_notifs ? (msg.guild.channels.find(ch => ch.id == cfg.ban_notifs) ? msg.guild.channels.find(ch => ch.id == cfg.ban_notifs).name : "Invalid channel! Please set again") : "Not set"}`}
				]
			}})
		}
	},
	guildOnly: true,
	subcommands: {},
	permissions: ["manageMessages"]
}

module.exports.subcommands.accept = {
	help: ()=> "Manually accept a server's sync request",
	usage: ()=> [" [serverID] - Accepts the given server's sync request"],
	execute: async (bot, msg, args) => {
		if(!args[0]) return msg.channel.createMessage("Please provide a server to accept a request from");
		var request = await bot.utils.getSyncRequest(bot, msg.guild.id, args[0]);
		if(!request) return msg.channel.createMessage("Couldn't find an open request from that server");

		if(request.confirmed) return msg.channel.createMessage("That request has already been confirmed");

		if(request.message) {
			var message;
			try {
				var message = await bot.getMessage(request.channel, request.message);
				if(message) {
					await bot.editMessage(request.channel, request.message, {embed: {
						title: "Sync Request",
						description: message.embeds[0].description.split("\n")[0]+"UPDATE: This request has been accepted!",
						footer: {
							text: "Requester ID: "+request.requester
						},
						color: parseInt("55aa55",16)
					}});
					await bot.utils.deleteSyncMenu(bot, message.channel.guild.id, message.channel.id, message.id);
				}
			} catch(e) {
				console.log(e);
				msg.channel.createMessage("Notification for this request couldn't be updated; the request can still be confirmed, however");
			}
		}

		var scc = await bot.utils.updateSyncConfig(bot, request.requester, {confirmed: true});
		if(scc) {
			var ch;
			if(request.requester_channel) {
				try {
					await bot.createMessage(request.requester_channel, "Your sync request has been accepted! Make sure to use `hub!ban notifs [channel]` if you want ban notifications from this server and haven't already set it up");
				} catch(e) {
					console.log(e);
					msg.channel.createMessage("Couldn't send the requester the acceptance notification; please make sure they're aware that their server was accepted and that they should use `hub!ban notifs [channel]` if they want ban notifications")
				}
			}
		} else msg.channel.createMessage("Something went wrong while updating the request. Please try again");
	},
	guildOnly: true,
	permissions: ["manageMessages"],
	alias: ["confirm"]
}

module.exports.subcommands.deny = {
	help: ()=> "Manually denies a server's sync request",
	usage: ()=> [" [serverID] - Denies the given server's sync request"],
	desc: ()=> "This command can be used to revoke a sync at any time.",
	execute: async (bot, msg, args) => {
		if(!args[0]) return msg.channel.createMessage("Please provide a server to deny a request from");
		var request = await bot.utils.getSyncRequest(bot, msg.guild.id, args[0]);
		if(!request) return msg.channel.createMessage("Couldn't find an open request from that server");

		if(request.message) {
			var message;
			try {
				var message = await bot.getMessage(request.channel, request.message);
				if(message) {
					await bot.editMessage(request.channel, request.message, {embed: {
						title: "Sync Request",
						description: message.embeds[0].description.split("\n")[0]+"UPDATE: This request has been denied.",
						footer: {
							text: "Requester ID: "+request.requester
						},
						color: parseInt("aa5555",16)
					}});
					await bot.utils.deleteSyncMenu(bot, message.channel.guild.id, message.channel.id, message.id);
				}
			} catch(e) {
				console.log(e);
				msg.channel.createMessage("Notification for this request couldn't be updated; the request can still be denied, however");
			}
		}

		var scc = await bot.utils.updateSyncConfig(bot, request.requester, {confirmed: false, sync_id: ""});
		if(scc) {
			var ch;
			if(request.requester_channel) {
				try {
					await bot.createMessage(request.requester_channel, "Your sync request has been denied. "+(request.confirmed ? "You'll no longer receive notifications from this server" : ""));
				} catch(e) {
					console.log(e);
					msg.channel.createMessage("Couldn't send the requester the acceptance notification; please make sure they're aware that their server was denied")
				}
			}
		} else msg.channel.createMessage("Something went wrong while updating the request. Please try again");
	},
	guildOnly: true,
	permissions: ["manageMessages"]
}

module.exports.subcommands.enable = {
	help: ()=> "Allows others to sync to your server",
	usage: ()=> [" - Lets others use `hub!sync [guildID]` to sync to your server"],
	execute: async (bot, msg, args) => {
		var cfg = await bot.utils.getSyncConfig(bot, msg.guild.id);
		if(!cfg || !cfg.sync_notifs) return msg.channel.createMessage("Please run `hub!sync notifs [channel]` before enabling syncing");
		if(cfg.enabled) return msg.channel.createMessage("Syncing is already enabled!");

		var scc = await bot.utils.updateSyncConfig(bot, msg.guild.id, {syncable: true});
		if(scc) msg.channel.createMessage("Syncing enabled!");
		else msg.channel.createMessage("Something went wrong");
	},
	guildOnly: true,
	permissions: ["manageMessages"]
}

module.exports.subcommands.disable = {
	help: ()=> "Allows others to sync to your server",
	usage: ()=> [" - Lets others use `hub!sync [guildID]` to sync to your server"],
	execute: async (bot, msg, args) => {
		var cfg = await bot.utils.getSyncConfig(bot, msg.guild.id);
		if(!cfg.enabled) return msg.channel.createMessage("Syncing is already disabled!");

		var scc = await bot.utils.updateSyncConfig(bot, msg.guild.id, {syncable: false});
		if(scc) msg.channel.createMessage("Syncing disabled!");
		else msg.channel.createMessage("Something went wrong");
	},
	guildOnly: true,
	permissions: ["manageMessages"]
}

module.exports.subcommands.notification = {
	help: ()=> "Sets the channel for sync notifications from a host server, or for those looking to sync with your server",
	usage: ()=> [" [channel] - Sets the sync notifs channel"],
	desc: ()=> "The channel can be a #channel, ID, or channel-name",
	execute: async (bot, msg, args) => {
		var channel = msg.guild.channels.find(ch => (ch.name == args[0].toLowerCase() || ch.id == args[0].replace(/[<#>]/g,"")) && ch.type == 0);
		if(!channel) return msg.channel.createMessage("Couldn't find that channel");

		var scc = await bot.utils.updateSyncConfig(bot, msg.guild.id, {sync_notifs: channel.id});
		if(scc) msg.channel.createMessage("Channel set! You can now allow others to sync to your server, or sync with another server");
		else msg.channel.createMessage("Something went wrong");
	},
	alias: ["notif", "notifications", "notifs"],
	guildOnly: true,
	permissions: ["manageMessages"]
}

module.exports.subcommands.setup = {
	help: ()=> "Runs a setup menu for your server",
	usage: ()=> " - Runs the syncing setup menu",
	execute: async (bot, msg, args) => {
		var cfg = await bot.utils.getSyncConfig(bot, msg.guild.id);
		if(cfg.sync_id && !cfg.confirmed) return msg.channel.createMessage("You already have a pending sync request out. Please wait to change synced servers until after that request goes through");
		var resp;
		var schan;
		var bchan;
		var sguild;

		await msg.channel.createMessage([
			"What would you like to do?",
			"```",
			"1 - Sync with another server",
			"2 - Allow others to sync to your server",
			"```"
		].join("\n"));
		resp = await msg.channel.awaitMessages(m => m.author.id == msg.author.id, {time: 30000, maxMatches: 1});
		if(!resp || !resp[0]) return msg.channel.createMessage("ERR: timed out. Aborting...");
		switch(resp[0].content) {
			case "1":
				if(cfg.syncable) {
					await msg.channel.createMessage("WARNING: Syncing your guild with another guild will stop others from syncing with yours. Are you sure you want to do this? (y/n)");
					var resp;
					var resp = await msg.channel.awaitMessages(m => m.author.id == msg.author.id, {maxMatches: 1, time: 30000});
					if(!resp || !resp[0]) return msg.channel.createMessage("ERR: timed out. Aborting...");
					if(!["y","yes"].includes(resp[0].content.toLowerCase())) return msg.channel.createMessage("Action cancelled");
				}

				await msg.channel.createMessage("Please enter the ID of the server you would like to sync with");
				resp = await msg.channel.awaitMessages(m => m.author.id == msg.author.id, {time: 60000, maxMatches: 1});
				if(!resp || !resp[0]) return msg.channel.createMessage("ERR: timed out. Aborting...");
				sguild = await bot.utils.getSyncConfig(bot, resp[0].content);;
				if(!sguild) return msg.channel.createMessage("ERR: either I'm not in that server or that server cannot be synced with. Aboring...");

				await msg.channel.createMessage("Please enter a channel for sync notifications. These are the notifications you'll get when your sync request is accepted or denied");
				resp = await msg.channel.awaitMessages(m => m.author.id == msg.author.id, {time: 60000, maxMatches: 1});
				if(!resp || !resp[0]) return msg.channel.createMessage("ERR: timed out. Aborting...");
				schan = msg.guild.channels.find(ch => (ch.name == resp[0].content.toLowerCase() || ch.id == resp[0].content.replace(/[<#>]/g,"")) && ch.type == 0);
				if(!schan) return msg.channel.createMessage("ERR: couldn't find the given channel. Aborting...");

				await msg.channel.createMessage("Please enter a channel for ban notifications. These are the notifications you'll get when members in your server are banned in the synced server, or when members you have banned are unbanned there");
				resp = await msg.channel.awaitMessages(m => m.author.id == msg.author.id, {time: 60000, maxMatches: 1});
				if(!resp || !resp[0]) return msg.channel.createMessage("ERR: timed out. Aborting...");
				bchan = msg.guild.channels.find(ch => (ch.name == resp[0].content.toLowerCase() || ch.id == resp[0].content.replace(/[<#>]/g,"")) && ch.type == 0);
				if(!bchan) return msg.channel.createMessage("ERR: couldn't find the given channel. Aborting...");

				try {
					var message = await bot.createMessage(sguild.sync_notifs, {embed: {
						title: "Sync Confirmation",
						description: [`User ${msg.author.username}#${msg.author.discriminator} (${msg.author.id}) `,
									  `from guild ${msg.guild.name} (${msg.guild.id}) has requested to sync with your server!\n`,
									  `React with :white_check_mark: to allow this, or :x: to deny it.`].join(""),
						footer: {
							text: `Requester ID: ${msg.guild.id}`
						},
						color: parseInt("5555aa",16)
					}})
				} catch(e) {
					console.log(e);
					return msg.channel.createMessage("Something went wrong when sending a confirmation to that guild. Please contact the guild's admins and make sure their `sync_notifs` channel exists and that I can message it");
				}
				try {
					["✅","❌"].forEach(r => message.addReaction(r));
				} catch(e) {
					//just couldn't add the reacts, should be fine to ignore, maybe let the server know though
					console.log(e);
					message.channel.createMessage("(Couldn't add the reactions- make sure I have the `addReactions` permission! Reactions from mods should still work, however)");
				}
				
				var scc = await bot.utils.addSyncMenu(bot, message.guild.id, message.channel.id, message.id, 0, msg.guild.id, cfg.sync_notifs);
				var scc2 = await bot.utils.updateSyncConfig(bot, msg.guild.id, {syncable: false, confirmed: false, sync_id: sguild.server_id, sync_notifs: schan.id, ban_notifs: bchan.id});

				if(scc && scc2) msg.channel.createMessage("Confirmation sent! You'll get a notification when they accept/deny it");
				else if(!scc && scc2) {
					msg.channel.createMessage("Something went wrong when inserting the confirmation into the database. This request can still be manually confirmed, however");
					await message.edit({embed: {
						title: "Sync Confirmation",
						description: [`User ${msg.author.username}#${msg.author.discriminator} (${msg.author.id}) `,
									  `from guild ${msg.guild.name} (${msg.guild.id}) has requested to sync with your server!\n`,
									  `Use \`hub!sync accept ${msg.guild.id}\` to accept it or \`hub!sync deny ${msg.guild.id}\` to deny it.`].join(""),
						footer: {
							text: `Requester ID: ${msg.guild.id}`
						}
					}})
				} else if(scc && !scc2) msg.channel.createMessage("Couldn't update your sync config. This request can still be confirmed, however");
				else {
					msg.channel.createMessage("Couldn't add the sync menu or update your sync config, thus this sync attempt cannot be completed. Please try again");
					await message.edit({embed: {
						title: "Sync Confirmation",
						description: [`User ${msg.author.username}#${msg.author.discriminator} (${msg.author.id}) `,
									  `from guild ${msg.guild.name} (${msg.guild.id}) has requested to sync with your server!\n`,
									  `UPDATE: Something went wrong when handling this sync request. This request cannot be accepted or denied.`].join(""),
						footer: {
							text: `Requester ID: ${msg.guild.id}`
						}
					}})
				}
				break;
			case "2":
				if(cfg.sync_id && cfg.confirmed) {
					await msg.channel.createMessage("WARNING: Allowing others to sync with your guild will terminate your current sync link. Are you sure you want to do this? (y/n)");
					resp = await msg.channel.awaitMessages(m => m.author.id == msg.author.id, {maxMatches: 1, time: 30000});
					if(!resp || !resp[0]) return msg.channel.createMessage("ERR: timed out. Aborting...");
					if(!["y","yes"].includes(resp[0].content.toLowerCase())) return msg.channel.createMessage("Action cancelled");
				}
				await msg.channel.createMessage("Please enter a channel for sync notifications. These are the notifications you'll get when others request to sync with you");
				resp = await msg.channel.awaitMessages(m => m.author.id == msg.author.id, {time: 60000, maxMatches: 1});
				if(!resp || !resp[0]) return msg.channel.createMessage("ERR: timed out. Aborting...");
				schan = msg.guild.channels.find(ch => (ch.name == resp[0].content.toLowerCase() || ch.id == resp[0].content.replace(/[<#>]/g,"")) && ch.type == 0);
				if(!schan) return msg.channel.createMessage("ERR: couldn't find the given channel. Aborting...");

				var scc = await bot.utils.updateSyncConfig(bot, msg.guild.id, {syncable: true, confirmed: false, sync_id: "", sync_notifs: schan.id});
				if(scc) msg.channel.createMessage("Syncing enabled!");
				else msg.channel.createMessage("Something went wrong");
				break;
			default:
				msg.channel.createMessage("ERR: invalid input. Aborting...");
				break;
		}
	},
	guildOnly: true,
	permissions: ["manageMessages"]
}

module.exports.subcommands.cancel = {
	help: ()=> "Cancels an outgoing sync request, or terminates an existing sync link",
	usage: ()=> [" - Cancels/terminates your current sync setup"],
	desc: ()=> "This command can be used to cancel syncing at any time.",
	execute: async (bot, msg, args) => {
		var cfg = await bot.utils.getSyncConfig(bot, msg.guild.id);
		if(!cfg || !cfg.sync_id) return msg.channel.createMessage("Nothing to cancel");

		var request = await bot.utils.getSyncRequest(bot, cfg.sync_id, msg.guild.id);

		if(request && request.message) {
			var message;
			try {
				var message = await bot.getMessage(request.channel, request.message);
				if(message) {
					await bot.editMessage(request.channel, request.message, {embed: {
						title: "Sync Request",
						description: message.embeds[0].description.split("\n")[0]+"UPDATE: This request has been cancelled by the requester.",
						footer: {
							text: "Requester ID: "+request.requester
						},
						color: parseInt("aa5555",16)
					}});
					await bot.utils.deleteSyncMenu(bot, message.channel.guild.id, message.channel.id, message.id);
				}
			} catch(e) {
				console.log(e);
				msg.channel.createMessage("Notification for this request couldn't be updated; the request can still be cancelled, however");
			}
		}

		var scc = await bot.utils.updateSyncConfig(bot, msg.guild.id, {confirmed: false, sync_id: ""});
		if(scc) msg.channel.createMessage(`Sync ${cfg.confirmed ? "terminated" : "cancelled"}!`)
		else msg.channel.createMessage("Something went wrong while updating the request. Please try again");
	},
	guildOnly: true,
	permissions: ["manageMessages"]
}