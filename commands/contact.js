module.exports = {
	help: ()=> "Sets, adds, or removes contact(s) for a server.",
	usage: ()=> [" [server_id] [user_id] - Sets server contact(s).",
				 " add [server_id] [user_id] - Adds server contact(s).",
				 " remove [server_id] [user_id] - Removes server contact. *(only one at a time, for ease)*"
				],
	execute: async (bot, msg, args)=>{
		if(!args[1]) return msg.channel.createMessage("Please provide a server ID and contact.");
		let guild = await bot.utils.getServer(bot, args[0]);
		if(!guild) return msg.channel.createMessage("That server does not exist.");

		var dat = await bot.utils.verifyUsers(bot, args.slice(1));
		
		bot.db.query(`UPDATE servers SET contact_id = ? WHERE server_id = ?`,[dat.pass.join(" "), guild.server_id],(err,res)=>{
			if(err) {
				console.log(err);
				msg.channel.createMessage("There was an error.");
			} else {
				console.log(dat);
				msg.channel.createMessage("Contact updated!" + (dat.fail.length > 0 ? '\nFollowing contacts not added (users do not exist):\n'+dat.fail.join("\n") : ""));
			}
		})

		var res2 = await bot.utils.updatePosts(bot, args[0]);
		if(!res2) {
			msg.channel.createMessage('Something went wrong while updating post')
		}

		var conf = await bot.utils.getConfig(bot, msg.guild.id);
		if(!conf) return;
		console.log(conf.reprole);
		if(!conf.reprole) return;
		await Promise.all(dat.pass.map(async m => {
			try {
				await msg.guild.addMemberRole(m, conf.reprole)
				return new Promise(res => setTimeout(()=> res(1), 100))
			} catch(e) {
				console.log(e);
			}
		}))
	},
	subcommands: {},
	alias: ["con","c"]
}

module.exports.subcommands.add = {
	help: ()=> "Adds contact(s) to a server. User IDs should be space delimited.",
	usage: ()=> [" [servID] [usrID] [usrID]... - Adds contact(s) to the server."],
	execute: async (bot, msg, args) => {
		if(!args[1]) return msg.channel.createMessage("Please provide a server ID and contact.");
		let guild = await bot.utils.getServer(bot, args[0]);
		if(!guild) return msg.channel.createMessage("That server does not exist.");

		var dat = await bot.utils.verifyUsers(bot, args.slice(1));
		
		bot.db.query(`UPDATE servers SET contact_id = ? WHERE server_id = ?`,[guild.contact_id + " " + dat.pass.join(" "), guild.server_id],(err,res)=>{
			if(err) {
				console.log(err);
				msg.channel.createMessage("There was an error.");
			} else {
				console.log(dat);
				msg.channel.createMessage("Contact updated!" + (dat.fail.length > 0 ? '\nFollowing contacts not added (users do not exist):\n'+dat.fail.join("\n") : ""));
			}
		})

		var res2 = await bot.utils.updatePosts(bot, args[0]);
		if(!res2) {
			msg.channel.createMessage('Something went wrong while updating post')
		}

		var conf = await bot.utils.getConfig(bot, msg.guild.id);
		if(!conf) return;
		if(!conf.reprole) return;
		await Promise.all(dat.pass.map(async m => {
			try {
				await msg.guild.addMemberRole(m, conf.reprole)
				return new Promise(res => setTimeout(()=> res(1), 100))
			} catch(e) {
				console.log(e);
			}
		}))
	}
}

module.exports.subcommands.remove = {
	help: ()=> "Removes a contact from a server.",
	usage: ()=> [" [servID] [usrID] - Removes one (1) contact from the server."],
	execute: async (bot, msg, args) => {
		if(!args[1]) return msg.channel.createMessage("Please provide a server ID and contact.");
		let guild = await bot.utils.getServer(bot, args[0]);
		if(!guild) return msg.channel.createMessage("That server does not exist.");
		bot.db.query(`UPDATE servers SET contact_id = ? WHERE server_id = ?`,[guild.contact_id.split(" ").filter(c => c!= args[1]).join(" "), guild.server_id],(err,res)=>{
			if(err) {
				console.log(err);
				msg.channel.createMessage("There was an error.");
			} else {
				console.log(res);
				msg.channel.createMessage("Contact updated!");
			}
		})

		var res2 = await bot.utils.updatePosts(bot, args[0]);
		if(!res2) {
			msg.channel.createMessage('Something went wrong while updating post')
		}

		var conf = await bot.utils.getConfig(bot, args[0]);
		if(!conf) return;
		if(!conf.reprole) return;
		try {
			await msg.guild.addMemberRole(args[1], conf.reprole)
			return new Promise(setTimeout(()=> res(1), 100))
		} catch(e) {
			console.log(e);
		}
	}
}