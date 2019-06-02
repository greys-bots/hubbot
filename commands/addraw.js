module.exports = {
	help: ()=> "Adds a server without resolving an invite.",
	usage: ()=> [" [ID] <name>- Adds server without resolving an invite and gives it a name if provided"],
	execute: async (bot, msg, args)=>{

		var exists = await bot.utils.getServer(bot, args[0]);
		if(exists) return msg.channel.createMessage('Server already exists!');
		bot.db.query(`INSERT INTO servers SET ?`,{
			server_id: 	args[0],
			name: 		args.slice(1).join(" "),
			invite: 	"",
			pic_url: 	""
		});

		msg.channel.createMessage(`Server added! ID: ${args[0]}`);
	}
}