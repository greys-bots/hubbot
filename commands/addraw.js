module.exports = {
	help: ()=> "Adds a server without resolving an invite.",
	usage: ()=> [" [ID] <name>- Adds server without resolving an invite and gives it a name if provided"],
	execute: async (bot, msg, args)=>{

		var exists = await bot.utils.getServer(bot, args[0]);
		if(exists) return msg.channel.createMessage('Server already exists!');
		bot.db.query(`INSERT INTO servers (server_id, name) VALUES (?,?)`,[
			args[0],
			args.slice(1).join(" "),
			"",
			""
		]);

		msg.channel.createMessage(`Server added! ID: ${args[0]}`);
	}
}