module.exports = {
	help: ()=> "Set a server's activity rating",
	usage: ()=> [" [serverID] [serverID] ... (new line) (value) - Sets the activity rating for the given server(s)"],
	execute: async (bot, msg, args) => {
		var nargs = args.join(" ").split('\n');
		var guilds = nargs[0].split(" ");
		var rating = nargs.slice(1).join("\n");
		var errs = [];
		
		for(var g of guilds) {
			var guild = await bot.stores.servers.get(msg.guild.id, g);
			if(!guild) {
				errs.push({id: g, reason: 'Guild not found'});
				continue;
			}

			if(!guilds[1] && !nargs[1]) return `Current value: ${guild.activity || "not set"}`;
			
			try {
				guild = await bot.stores.servers.update(msg.guild.id, g, {activity: rating});
				await bot.stores.serverPosts.updateByHostedServer(msg.guild.id, g, guild);
			} catch(e) {
				errs.push({id: g, reason: e.message})
			}
		}

		if(errs[0]) {
			return errs.map((e) => {
				return {content: "Some servers couldn't be updated:", embed: {
					title: e.id,
					description: e.reason
				}}
			})
		} else return `Rating${guilds[1] ? 's' : ''} updated!`
	},
	guildOnly: true,
	alias: ["rating"],
	permissions: ["manageMessages"]
}