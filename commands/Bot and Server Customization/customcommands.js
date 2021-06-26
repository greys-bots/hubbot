module.exports = {
	help: ()=> "Create custom commands",
	usage: ()=> [" - List current custom commands",
				 " create - Run a menu to create a new command",
				 " info [commandname] - Get info on a command",
				 " edit [commandname] - Edit a command",
				 " delete [commandname] - Delete a custom command"],
	execute: async (bot, msg, args) => {
		var cmds = await bot.stores.customCommands.getAll(msg.guild.id);
		if(!cmds) return "No custom commands registered for this server";

		return {
			embed: {
				title: "Custom commands",
				description: cmds.map(c => c.name).join("\n")
			}
		}
	},
	subcommands: {},
	alias: ["cc", "custom"],
	guildOnly: true,
	permissions: ["manageGuild"]
}

module.exports.subcommands.add = {
	help: ()=> "WORK IN PROGRESS",
	usage: ()=> ["WORK IN PROGRESS"],
	execute: async (bot, msg, args) => {
		var name;
		var actions = [];
		var del;
		var response;
		var target;
		var done = false;
		await msg.channel.createMessage("Enter a name for the command.");
		try {
			response = (await msg.channel.awaitMessages(m => m.author.id == msg.author.id, {time:1000*60*5, maxMatches: 1, }))[0].content.replace(/\s/g,"").toLowerCase();
		} catch(e) {
			console.log(e);
			return "Action cancelled: timed out";
		}
		var cmd = await bot.stores.customCommands.get(msg.guild.id, response);
		if(cmd || bot.commands.get(bot.aliases.get(response))) return "ERR: Command with that name exists. Aborting";
		name = response;

		await msg.channel.createMessage(`Who is the target of the command?
		\`\`\`
		user - the person that used the command
		args - people specified through arguments (using member IDs)
		\`\`\`
		`)
		response = (await msg.channel.awaitMessages(m => m.author.id == msg.author.id, {time:1000*60*5, maxMatches: 1, }))[0].content.toLowerCase();

		if(response == "user") target = "member";
		else if(response == "args") target = "args";
		else return "ERR: Invalid target. Aborting";

		try {
			for(var i = 0; i < 5; i++) {
				if(done) break;
				await msg.channel.createMessage(`
				Action number: ${actions.length+1}/5\nAvailable actions:
				\`\`\`
				rr - remove a role
				ar - add a role
				bl - blacklist user from using the bot
				\`\`\`
				Type \`finished\` to end action adding`);

				response = (await msg.channel.awaitMessages(m => m.author.id == msg.author.id, {time:1000*60*5, maxMatches: 1, }))[0].content.toLowerCase();
				switch(response) {
					case "rr":
						await msg.channel.createMessage("Type the name of the role you want to remove.")
						response = (await msg.channel.awaitMessages(m => m.author.id == msg.author.id, {time:1000*60*5, maxMatches: 1, }))[0].content.toLowerCase();
						var role = msg.guild.roles.find(r => r.id == response.replace(/[<@&>]/g, "") || r.name.toLowerCase() == response);
						if(!role) return "ERR: Role not found. Aborting";
						actions.push({type: "rr", action: `${target}.rr(rf('${role.id}'))`})
						break;
					case "ar":
						await msg.channel.createMessage("Type the name of the role you want to add.")
						response = (await msg.channel.awaitMessages(m => m.author.id == msg.author.id, {time:1000*60*5, maxMatches: 1, }))[0].content.toLowerCase();
						var role = msg.guild.roles.find(r => r.id == response.replace(/[<@&>]/g, "") || r.name.toLowerCase() == response);
						if(!role) return "ERR: Role not found. Aborting";
						actions.push({type: "ar", action: `${target}.ar(rf('${role.id}'))`})
						break;
					case "bl":
						actions.push({type: "bl", action: `${target}.bl`})
						break;
					case "finished":
						done = true;
						break;
					default:
						return "ERR: Invalid action. Aborting";
						break;
				}

				if(!done) {
					await msg.channel.createMessage("Enter a success message for this action. NOTE: if using args as the target, this message will fire for every arg. Type `skip` to skip");
					response = (await msg.channel.awaitMessages(m => m.author.id == msg.author.id, {time:1000*60*5, maxMatches: 1, }))[0].content;
					if(response.toLowerCase() != "skip") actions[i].success = response;

					await msg.channel.createMessage("Enter a fail message for this action. NOTE: if using args as the target, this message will fire for every arg. Type `skip` to skip");
					response = (await msg.channel.awaitMessages(m => m.author.id == msg.author.id, {time:1000*60*5, maxMatches: 1, }))[0].content;
					if(response.toLowerCase() != "skip") actions[i].fail = response;
				}
			}
		} catch(e) {
			return "Action cancelled: timed out";
		}

		if(actions.length == 0) return "ERR: No actions added. Aborting";

		await msg.channel.createMessage("Would you like the user's message to be deleted? (y/n)");
		response = (await msg.channel.awaitMessages(m => m.author.id == msg.author.id, {time:1000*60*5, maxMatches: 1, }))[0].content.toLowerCase();
		if(response == "y") del = true;
		else del = false;

		await msg.channel.createMessage({content: "Is this correct? (y/n)", embed: {
			title: name,
			description: (del ? "Message will be deleted after command execution" : "Message will not be deleted after command execution")+"\n"+
						 (target == "member" ? "Command will affect who is using it" : "Command will affect members given as arguments"),
			fields: actions.map((a, i) => {
				return {name: "Action "+(i+1), value: a.action}
			})
		}})

		response = (await msg.channel.awaitMessages(m => m.author.id == msg.author.id, {time:1000*60*5, maxMatches: 1, }))[0].content.toLowerCase();
		if(response != "y") return "Action aborted";

		try {
			await bot.stores.customCommands.create(msg.guild.id, name, {actions, target, del});
		} catch(e) {
			return e;
		}

		return "Custom command added!";
	},
	alias: ['create', 'new'],
	permissions: ["manageGuild"],
	guildOnly: true
}

module.exports.subcommands.delete = {
	help: ()=> "Delete a custom command",
	usage: ()=> [" [cmdName] - Deletes the given command"],
	execute: async (bot, msg, args) => {
		if(!args[0]) return "Please provide a command to delete";

		var cmd = await bot.stores.customCommands.get(msg.guild.id, args[0]);
		if(!cmd) return "Command does not exist";

		try {
			await bot.stores.customCommands.delete(msg.guild.id, args[0]);
		} catch(e) {
			return e;
		}

		return "Command deleted!";
	},
	alias: ['remove'],
	guildOnly: true,
	permissions: ["manageGuild"]
}

module.exports.subcommands.blacklist = {
	help: ()=> "Blacklist channels/roles from using a custom command",
	usage: ()=> [
		' [name] - Views an existing blacklist',
		' [name] add [channel/role] - Adds the given channel/role to the blacklist',
		' [name] remove [channel/role] - Removes the channel/role from the blacklist',
		' [name] clear - Clear the blacklist',
		' [name] switch - Switches from the whitelist to the blacklist'
	],
	execute: async (bot, msg, args) => {
		if(!args[0]) return "Please provide a command";

		var cmd = await bot.stores.customCommands.get(msg.guild.id, args[0].toLowerCase());
		if(!cmd) return "Command does not exist";
		if(cmd.usage_type) return 'Command currently set to `whiitelist` mode!';

		if(!args[1]) {
			if(!cmd.usage_list.channels?.[0] && !cmd.usage_list.roles?.[0])
				return 'Nothing blacklisted for that command';

			return {embed: {
				title: "Blacklist",
				description: `Blacklist for command ${cmd.name}`,
				fields: [
					{name: "Channels", value: cmd.usage_list.channels.map(c => `<#${c}>`).join("\n") || "(none)"},
					{name: "Roles", value: cmd.usage_list.roles.map(r => `<@&${r}>`).join("\n") || "(none)"}
				],
				footer: {text: `use "${bot.prefix}cc wl ${cmd.name} switch" to use a whitelist instead`}
			}}
		}

		switch(args[1].toLowerCase()) {
			case 'add':
				if(!args[2]) return 'Please provide a channel/role to add to the blacklist';

				var arg = args[2].toLowerCase().replace(/[<@&#>]/g, "");
				var object = msg.guild.channels.find(ch => [ch.name, ch.id].includes(arg));
				var type = 'channels';
				if(!object) {
					object = msg.guild.roles.find(r => [r.name, r.id].includes(arg));
					type = 'roles';
				}
				if(!object) return 'Object not found!';

				if(!cmd.usage_list[type].includes(object.id)) cmd.usage_list[type].push(object.id);
				await bot.stores.customCommands.update(msg.guild.id, cmd.name, {usage_list: cmd.usage_list});
				return 'Object added to blacklist!';
			case 'remove':
				if(!args[2]) return 'Please provide a channel/role to remove from the blacklist';

				var arg = args[2].toLowerCase().replace(/[<@&#>]/g, "");
				var object = msg.guild.channels.find(ch => [ch.name, ch.id].includes(arg));
				var type = 'channels';
				if(!object) {
					object = msg.guild.roles.find(r => [r.name, r.id].includes(arg));
					type = 'roles';
				}
				if(!object) return 'Object not found!';

				cmd.usage_list[type].filter(x => x != object.id);
				await bot.stores.customCommands.update(msg.guild.id, cmd.name, {usage_list: cmd.usage_list});
				return 'Object removed from blacklist!';
				break;
			case 'clear':
				var message = await msg.channel.createMessage("Are you sure you want to clear the blacklist?");
				['✅','❌'].forEach(r => message.addReaction(r));
				var conf = await bot.utils.getConfirmation(bot, message, msg.author);
				if(conf.msg) return conf.msg;

				await bot.stores.customCommands.update(msg.guild.id, cmd.name, {usage_list: {channels: [], roles: []}});
				return 'Blacklist cleared!';
				break;
			case 'switch':
				await bot.stores.customCommands.update(msg.guild.id, cmd.name, {usage_type: true});
				return 'Whitelist turned on! Use the whitelist command from now on';
				break;
			default:
				return `Subcommand not found; use \`${bot.prefix}h cc blacklist\` for more info`
		}
	},
	alias: ['bl'],
	guildOnly: true,
	permissions: ['manageGuild']
}

module.exports.subcommands.whitelist = {
	help: ()=> "Whitelist channels/roles for using a custom command",
	usage: ()=> [
		' [name] - Views an existing whitelist',
		' [name] add [channel/role] - Adds the given channel/role to the whitelist',
		' [name] remove [channel/role] - Removes the channel/role from the whitelist',
		' [name] clear - Clear the whitelist',
		' [name] switch - Switches from the whitelist to the whitelist'
	],
	execute: async (bot, msg, args) => {
		if(!args[0]) return "Please provide a command";

		var cmd = await bot.stores.customCommands.get(msg.guild.id, args[0].toLowerCase());
		if(!cmd) return "Command does not exist";
		if(!cmd.usage_type) return 'Command currently set to `blacklist` mode!';

		if(!args[1]) {
			if(!cmd.usage_list.channels?.[0] && !cmd.usage_list.roles?.[0])
				return 'Nothing whitelisted for that command';

			return {embed: {
				title: "Whitelist",
				description: `Whitelist for command ${cmd.name}`,
				fields: [
					{name: "Channels", value: cmd.usage_list.channels.map(c => `<#${c}>`).join("\n") || "(none)"},
					{name: "Roles", value: cmd.usage_list.roles.map(r => `<@&${r}>`).join("\n") || "(none)"}
				],
				footer: {text: `use "${bot.prefix}cc bl ${cmd.name} switch" to use a blacklist instead`}
			}}
		}

		switch(args[1].toLowerCase()) {
			case 'add':
				if(!args[2]) return 'Please provide a channel/role to add to the whitelist';

				var arg = args[2].toLowerCase().replace(/[<@&#>]/g, "");
				var object = msg.guild.channels.find(ch => [ch.name, ch.id].includes(arg));
				var type = 'channels';
				if(!object) {
					object = msg.guild.roles.find(r => [r.name, r.id].includes(arg));
					type = 'roles';
				}
				if(!object) return 'Object not found!';

				if(!cmd.usage_list[type].includes(object.id)) cmd.usage_list[type].push(object.id);
				await bot.stores.customCommands.update(msg.guild.id, cmd.name, {usage_list: cmd.usage_list});
				return 'Object added to whitelist!';
			case 'remove':
				if(!args[2]) return 'Please provide a channel/role to remove from the whitelist';

				var arg = args[2].toLowerCase().replace(/[<@&#>]/g, "");
				var object = msg.guild.channels.find(ch => [ch.name, ch.id].includes(arg));
				var type = 'channels';
				if(!object) {
					object = msg.guild.roles.find(r => [r.name, r.id].includes(arg));
					type = 'roles';
				}
				if(!object) return 'Object not found!';

				cmd.usage_list[type].filter(x => x != object.id);
				await bot.stores.customCommands.update(msg.guild.id, cmd.name, {usage_list: cmd.usage_list});
				return 'Object removed from whitelist!';
				break;
			case 'clear':
				var message = await msg.channel.createMessage("Are you sure you want to clear the whitelist?");
				['✅','❌'].forEach(r => message.addReaction(r));
				var conf = await bot.utils.getConfirmation(bot, message, msg.author);
				if(conf.msg) return conf.msg;

				await bot.stores.customCommands.update(msg.guild.id, cmd.name, {usage_list: {channels: [], roles: []}});
				return 'Whitelist cleared!';
				break;
			case 'switch':
				await bot.stores.customCommands.update(msg.guild.id, cmd.name, {usage_type: false});
				return 'Blacklist turned on! Use the blacklist command from now on';
				break;
			default:
				return `Subcommand not found; use \`${bot.prefix}h cc whitelist\` for more info`
		}
	},
	alias: ['wl'],
	guildOnly: true,
	permissions: ['manageGuild']
}