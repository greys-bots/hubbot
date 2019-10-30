module.exports = {
	help: ()=> "Manage server support tickets",
	usage: ()=> [" - List open tickets",
				 " post [channel] - Post the ticket starter message to a channel. Channel can be a #mention, an ID, or the channel-name",
				 " bind [channel] [messageID] - Bind ticket reacts to a specific message. Channel can be a #mention, an ID, or the channel-name",
				 " unbind [channel] [messageID] - Unbind ticket reacts from a specific message. Channel can be a #mention, and ID, or the channel-name",
				 " add [hid] [user] [user] ... - Add users to a ticket. Users can be @ mentions or IDs. Up to 10 users can be added to a ticket (others can be manually added via permissions)",
				 " remove [hid] [user] [user] ... - Remove users from a ticket. Users can be @ mentions or IDs",
				 " find [userID] - Find tickets started by the given user",
				 " archive <hid> - Archive a ticket (sends text transcript to command user and deletes channel). NOTE: Does NOT save images. If no hid is given, attempts to archive the current channel's ticket",
				 " delete [hid] - Delete a ticket. NOTE: Does not archive it automatically; use this if you don't plan on archiving it",
				 " config - Configure the ticket system. Use `hub!help ticket config` for more info"],
	desc: ()=> "Before using this, you should run `hub!ticket config`. Use `hub!ticket post [channel]` or `hub!ticket bind [channel] [messageID]` to open the system for reactions and ticket creation. Users can have a total of 5 tickets open at once to prevent spam.",
	execute: async (bot, msg, args) => {
		var tickets = await bot.utils.getTickets(bot, msg.guild.id);
		if(!tickets) return msg.channel.createMessage("No support tickets registered for this server");

		if(tickets.length > 10) {
			var embeds = await bot.utils.genEmbeds(bot, tickets, async dat => {
				return {
					name: `Ticket ${dat.hid}`,
					value: [
						`[first message](https://discordapp.com/channels/${msg.guild.id}/${dat.channel_id}/${dat.first_message})`,
						`Opener: ${dat.opener.username}#${dat.opener.discriminator} (${dat.opener.id})`
						`Users:\n${dat.users.map(u => `${u.username}#${u.discriminator} (${u.id})`).join("\n")}`
					].join("\n\n")
				}
			}, {
				title: "Server Suport Tickets",
				description: `Total tickets: ${tickets.length}`
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
			msg.channel.createMessage({embed: {
				title: "Server Support Tickets",
				description: `Total tickets: ${tickets.length}`,
				fields: tickets.map(t => {
					return {
						name: `Ticket ${t.hid}`,
						value: [
							`[first message](https://discordapp.com/channels/${msg.guild.id}/${t.channel_id}/${t.first_message})`,
							`Opener: ${t.opener.username}#${t.opener.discriminator} (${t.opener.id})`
							`Users:\n${t.users.map(u => `${u.username}#${u.discriminator} (${u.id})`).join("\n")}`
						].join("\n\n")
					}
				})
			}})
		}
	},
	permissions: ["manageMessages"],
	guildOnly: true,
	alias: ["support","tickets"],
	subcommands: {}
}

module.exports.subcommands.post = {
	help: ()=> "Post a message that users can react to in order to open tickets",
	usage: ()=> [" [channel] - Post the starter message"],
	desc: ()=> "The channel can be a #mention, channel ID, or channel-name",
	execute: async (bot, msg, args) => {
		if(!args[0]) return msg.channel.createMessage("Please provide a channel to post to");

		var cfg = await bot.utils.getSupportConfig(bot, msg.guild.id);
		if(!cfg) return msg.channel.createMessage("Please run `hub!ticket config` before doing this");

		var channel = msg.channelMentions.length > 0 ?
				   msg.guild.channels.find(ch => ch.id == msg.channelMentions[0]) :
				   msg.guild.channels.find(ch => ch.id == args[0] || ch.name == args[0].toLowerCase());
		if(!channel) return msg.channel.createMessage("Channel not found");

		try {
			var message = await channel.createMessage({embed: {
				title: "Start Ticket",
				description: "React to this post with ✅ to start a new ticket.\n\nNOTE: Users can have 5 tickets open at once.",
				color: 2074412
			}});
		} catch(e) {
			console.log(e.stack);
			return msg.channel.createMessage("ERR: \n"+e.message);
		}

		try {
			message.addReaction("✅")
		} catch(e) {
			console.log(e.stack);
			return msg.channel.createMessage("ERR: \n"+e.message);
		}

		var scc = await bot.utils.addTicketPost(bot, msg.guild.id, message.channel.id, message.id);
		if(scc) msg.channel.createMessage("Post sent!");
		else msg.channel.createMessage("Something went wrong")
	},
	permissions: ["manageMessages"],
	guildOnly: true
}

module.exports.subcommands.config = {
	help: ()=> "Configure ticket system settings",
	usage: ()=> [" - Show the current config",
				 " setup - Run the config menu"],
	execute: async (bot, msg, args) => {
		var cfg = await bot.utils.getSupportConfig(bot, msg.guild.id);
		if(!cfg) cfg = {category_id: ""};

		if(!args[0] || args[0] != "setup") return msg.channel.createMessage({embed: {
			title: "Ticket Config",
			fields: [
				{name: "Category ID", value: (cfg.category_id == "" ? "(*not set*)" : cfg.category_id)}
			]
		}});
		
		await msg.channel.createMessage("Enter the category that tickets should be created in. This can be the category name or ID. You have 1 minute to do this\nNOTE: This category's permissions should only allow mods and I to see channels; I handle individual permissions for users!");
		var resp = await msg.channel.awaitMessages(m => m.author.id == msg.author.id,{time:1000*60,maxMatches:1});
		if(!resp[0]) return msg.channel.createMessage("Action cancelled: timed out");
		var channel = await msg.guild.channels.find(c => (c.id == resp[0].content || c.name.toLowerCase() == resp[0].content.toLowerCase()) && c.type == 4);
		if(!channel) return msg.channel.createMessage("Action cancelled: category not found");

		var scc;
		if(cfg.category_id == "") {
			scc = await bot.utils.createSupportConfig(bot, msg.guild.id, channel.id);
		} else {
			scc = await bot.utils.updateSupportConfig(bot, msg.guild.id, "category_id", channel.id);
		}

		if(scc) msg.channel.createMessage("Config set!");
		else msg.channel.createMessage("Something went wrong");
	},
	permissions: ["manageGuild"],
	guildOnly: true,
}

module.exports.subcommands.archive = {
	help: ()=> "Archive a support ticket",
	usage: ()=> [" - Sends the user a text transcript of the channel's ticket and deletes the channel",
				 " [hid] - Sends the user a text transcript of the ticket with the given hid and deletes its channel"],
	desc: ()=> "This command does NOT save images. Please save images yourself before using the command!",
	execute: async (bot, msg, args) => {
		var hid = args[0] ? args[0].toLowerCase() : (msg.channel.name.startsWith("ticket") ? msg.channel.name.split("-")[1] : undefined);
		if(!hid) return msg.channel.createMessage("Please provide a ticket hid or use this command in a ticket channel");

		var ticket = await bot.utils.getSupportTicket(bot, msg.guild.id, hid);
		console.log(ticket);
		console.log(hid)
		if(!ticket) return msg.channel.createMessage("Couldn't find that ticket");

		var channel = msg.guild.channels.find(c => c.id == ticket.channel_id);
		if(!channel) return msg.channel.createMessage("Couldn't find the channel associated with that ticket");

		var messages = await channel.getMessages(10000, null, ticket.first_message);
		if(!messages) return msg.channel.createMessage("Either that channel has no messages or I couldn't get them");

		var data = [];
		messages.forEach(m => {
			var date = new Date(m.timestamp);
			data.push([`ID: ${m.id}`,
						`\r\n${m.author.username}#${m.author.discriminator + (m.author.bot ? " BOT" : "")} (${m.author.id})`,
						` | ${date.getMonth()+1}.${date.getDate()}.${date.getFullYear()}`,
						` at ${date.getHours()}:${date.getMinutes()}`,
						`\r\n${m.content}`].join(""))
		})

		var c = await bot.getDMChannel(msg.author.id);
		if(!c) return msg.channel.createMessage("Please make sure I can DM you");

		try {
			c.createMessage("Here is the archive: ",{file: Buffer.from(data.reverse().join("\r\n------\r\n")),name: channel.name+".txt"})
		} catch(e) {
			console.log(e);
			return msg.channel.createMessage("Error while DMing the archive:\n"+e.message+"\n\nAction aborted due to error");
		}

		try {
			channel.delete("Ticket archived");
		} catch(e) {
			console.log(e);
			return msg.channel.createMessage("Error while deleting channel:\n"+e.message)
		}

		var scc = await bot.utils.deleteSupportTicket(bot, msg.guild.id, channel.id);
		if(scc) {
			channel.id == msg.channel.id ? c.createMessage("Ticket successfully archived and deleted!") : msg.channel.createMessage("Ticket successfully archived and deleted!")
		} else {
			channel.id == msg.channel.id ? c.createMessage("Ticket archived, but could not be deleted from the database") : msg.channel.createMessage("Ticket archived, but could not be deleted from the database")
		}
	},
	permissions: ['manageMessages'],
	guildOnly: true
}

