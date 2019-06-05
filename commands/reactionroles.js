//REACTION ROLES (currently mostly finished)

module.exports = {
	help: ()=> "Sets, views, or edits reaction roles for the server",
	usage: ()=> [" - Views available reaction role configs",
				 " add [role] (new line) [emoji] (new line) <description> - Creates a new reaction role config, description optional (NOTE: to allow multi-word role names, all other arguments must be separated by a new line)",
				 " delete [role] - Removes an existing reaction role config",
				 " emoji [role] [newemoji] - Changes the emoji for an existing reaction role",
				 " description [role] (new line) [new description] - Changes the description for an existing reaction role (NOTE: description must be on a new line)",
				 " post [channel] - Posts reaction roles in the given channel (NOTE: only saves one post at a time; posts ALL roles and overwrites their categories)"
				],
	execute: async (bot, msg, args) => {
		var roles = await bot.utils.getReactionRoles(bot, msg.guild.id);
		if(roles.length == 0 || !roles) return msg.channel.createMessage('No reaction roles available');
		var invalid = [];
		await msg.channel.createMessage({embed: {
			title: "Server Reaction Roles",
			description: "All available roles for the server",
			fields: roles.map(r => {
				var rl = msg.guild.roles.find(x => x.id == r.role_id);
				 if(rl) {
				 	return {name: `${rl.name} (${r.emoji.includes(":") ? `<${r.emoji}>` : r.emoji})`, value: r.description || "*(no description provided)*"}
				 } else {
				 	invalid.push(r.role_id);
				 	return {name: r.role_id, value: '*Role not found. Removing after list.*'}
				 }
			})
		}})

		if(invalid.length > 0) {
			bot.db.query(`DELETE FROM reactroles WHERE role_id IN (`+invalid.join(", ")+")",(err, rows)=> {
				if(err) {
					console.log(err);
				} else {
					msg.channel.createMessage('Deleted reaction roles that no longer exist');
				}
			})
		}

		var res = await bot.utils.updateReactRolePost(bot, msg.guild.id, msg);
		if(!res) msg.channel.createMessage('Something went wrong while updating posts');
	},
	alias: ['rr', 'reactroles', 'reactrole', 'reactionrole'],
	subcommands: {}
}

module.exports.subcommands.add = {
	help: ()=> "Adds a new reaction role",
	usage: ()=> [" [role] (new line) [emoji] (new line) <description> - Creates a new reaction role config (NOTE: if emoji is custom, must be in the same server as the bot)"],
	execute: async (bot, msg, args)=> {
		var nargs = args.join(" ").split("\n");
		var role = msg.roleMentions.length > 0 ?
				   msg.roleMentions[0] :
				   msg.guild.roles.find(r => r.id == nargs[0] || r.name == nargs[0]).id;
		var emoji = nargs[1].replace(/[<>]/g,"");
		var description = nargs.slice(2).join("\n");
		bot.db.query(`INSERT INTO reactroles (server_id, role_id, emoji, description, category) VALUES (?,?,?,?,?)`,[
			msg.guild.id,
			role,
			emoji,
			description,
			"uncategorized"
		], (err, rows)=> {
			if(err) {
				console.log(err);
				msg.channel.createMessage('Something went wrong.');
			} else {
				msg.channel.createMessage('React role created!')
			}
		})

		var res = await bot.utils.updateReactRolePost(bot, msg.guild.id, msg);
		if(!res) msg.channel.createMessage('Something went wrong while updating posts');
	},
	alias: ['create', 'new']
}

module.exports.subcommands.remove = {
	help: ()=> "Removes a reaction role config",
	usage: ()=> [" [role] - Removes config for the role (NOTE: roles that are deleted automatically have their config removed when posting or listing configs"],
	execute: async (bot, msg, args)=> {
		var role = msg.roleMentions.length > 0 ?
				   msg.roleMentions[0] :
				   msg.guild.roles.find(r => r.id == args.join(" ") || r.name == args.join(" ")).id;
		bot.db.query(`DELETE FROM reactroles WHERE role_id=?`,[role],async (err, rows)=>{
			if(err) {
				console.log(err);
				msg.channel.createMessage('Something went wrong');
			} else {
				msg.channel.createMessage('React role deleted! NOTE: does not delete the actual role, nor remove it from members who have it');
				var res = await bot.utils.updateReactRolePost(bot, msg.guild.id, msg);
				if(!res) msg.channel.createMessage('Something went wrong while updating posts');
			}
		})
	},
	alias: ['delete']
}

module.exports.subcommands.post = {
	help: ()=> "Posts a message with all possible reaction roles",
	usage: ()=> " [channel] - Posts reaction roles message in given channel (NOTE: only saves one post at a time)",
	execute: async (bot, msg, args) => {
		var roles = await bot.utils.getReactionRoles(bot, msg.guild.id);
		if(!roles) return msg.channel.createMessage('No reaction roles available');

		var channel = msg.channelMentions.length > 0 ?
				   msg.guild.channels.find(ch => ch.id == msg.channelMentions[0]) :
				   msg.guild.channels.find(ch => ch.id == args[0] || ch.name == args[0]);
		if(!channel) return msg.channel.createMessage('Channel not found');

		var invalid = [];

		await channel.createMessage({embed: {
			title: "Server Reaction Roles",
			description: "All available roles for the server",
			fields: roles.map(r => {
				var rl = msg.guild.roles.find(x => x.id == r.role_id);
				 if(rl) {
				 	return {name: `${rl.name} (${r.emoji.includes(":") ? `<${r.emoji}>` : r.emoji})`, value: r.description || "*(no description provided)*"}
				 } else {
				 	invalid.push(r.role_id);
				 	return {name: r.role_id, value: '*Role not found. Removing after list.*'}
				 }
			})
		}}).then(message => {
			var reacts = roles.map(r => r.emoji);
			reacts.forEach(rc => message.addReaction(rc));
			bot.db.query(`UPDATE reactroles SET post_channel = ?, post_id = ?, category = ? WHERE server_id = ?`,[
				message.channel.id,
				message.id,
				"uncategorized",
				message.guild.id
			], (err, rows)=> {
				if(err) console.log(err);
			})
		})

		if(invalid.length > 0) {
			bot.db.query(`DELETE FROM reactroles WHERE role_id IN (`+invalid.join(", ")+")",(err, rows)=> {
				if(err) {
					console.log(err);
				} else {
					msg.channel.createMessage('Deleted reaction roles that no longer exist');
				}
			})
		}

		var res = await bot.utils.updateReactRolePost(bot, msg.guild.id, msg);
		if(!res) msg.channel.createMessage('Something went wrong while updating posts');
	}
}

module.exports.subcommands.update = {
	help: ()=> "Updates react role post (eg: in case roles have been deleted)",
	usage: ()=> [" - Updates react role post"],
	execute: async (bot, msg, args) => {
		var roles = await bot.utils.getReactionRoles(bot, msg.guild.id);
		if(!roles) return msg.channel.createMessage('No reaction roles available');

		var invalid = roles.map(r => {
			var rl = msg.guild.roles.find(x => x.id == r.role_id);
			 if(!rl) {
			 	return r.role_id;
			 } else {
			 	return null;
			 }
		}).filter(x => x!=null);

		if(invalid.length > 0) {
			bot.db.query(`DELETE FROM reactroles WHERE role_id IN (`+invalid.join(", ")+")",(err, rows)=> {
				if(err) {
					console.log(err);
				} else {
					msg.channel.createMessage('Deleted reaction roles that no longer exist');
				}
			})
		}

		var res = await bot.utils.updateReactRolePost(bot, msg.guild.id, msg);
		if(!res) msg.channel.createMessage('Something went wrong while updating posts');		

	}
}

module.exports.subcommands.emoji = {
	help: ()=> "Changes emoji for a role",
	usage: ()=> " [role] [emoji] - Changes emoji for the given role",
	execute: async (bot, msg, args)=> {
		var roles = await bot.utils.getReactionRoles(bot, msg.guild.id);
		if(!roles || roles.length == 0) return msg.channel.createMessage('No reaction roles available');
		var role = msg.roleMentions.length > 0 ?
				   msg.roleMentions[0] :
				   msg.guild.roles.find(r => r.id == args.slice(0, -1).join(" ") || r.name == args.slice(0, -1).join(" ")).id;
		var emoji = args[args.length - 1].replace(/[<>]/g,"");
		if(!role || (role && !roles.find(r => r.role_id == role)))
			return msg.channel.createMessage('Role does not exist');

		bot.db.query(`UPDATE reactroles SET emoji=? WHERE role_id=?`,[emoji, role],(err,rows)=> {
			if(err) {
				console.log(err);
				msg.channel.createMessage('Something went wrong');
			} else {
				msg.channel.createMessage('Emoji changed!')
			}
		})

		var res = await bot.utils.updateReactRolePost(bot, msg.guild.id, msg);
		if(!res) msg.channel.createMessage('Something went wrong while updating posts');
	}
}

module.exports.subcommands.description = {
	help: ()=> "Changes description for a role",
	usage: ()=> " [role] (new line) [description] - Changes description for the given role",
	execute: async (bot, msg, args)=> {
		var roles = await bot.utils.getReactionRoles(bot, msg.guild.id);
		if(!roles || roles.length == 0) return msg.channel.createMessage('No reaction roles available');
		var nargs = args.join(" ").split("\n");
		var role = msg.roleMentions.length > 0 ?
				   msg.roleMentions[0] :
				   msg.guild.roles.find(r => r.id == nargs[0] || r.name == nargs[0]).id;
		if(!role || (role && !roles.find(r => r.role_id == role)))
			return msg.channel.createMessage('Role does not exist');

		bot.db.query(`UPDATE reactroles SET description=? WHERE role_id=?`,[nargs.slice(1).join("\n"), role],(err,rows)=> {
			if(err) {
				console.log(err);
				msg.channel.createMessage('Something went wrong');
			} else {
				msg.channel.createMessage('Description changed!')
			}
		})

		var res = await bot.utils.updateReactRolePost(bot, msg.guild.id, msg);
		if(!res) msg.channel.createMessage('Something went wrong while updating posts');
	},
	alias: ["describe", "desc"]
}