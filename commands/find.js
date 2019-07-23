module.exports = {
	help: ()=> "Finds all servers matching a certain name.",
	usage: ()=> [" [name] - Finds every server that has the input in the name"],
	execute: async (bot, msg, args)=>{
		bot.db.query(`SELECT * FROM servers`,(err, rows)=>{
			if(err) {
				console.log(err);
				msg.channel.createMessage('There was an error!');
			} else {
				msg.channel.createMessage(rows.map(srv => {
					return srv.name.toLowerCase().includes(args.join(" ").toLowerCase()) ? `${srv.name} (${srv.server_id})` : null}).filter(x => x!=null).join('\n') || "None!")
			}
		})
	},
	alias: ['servers', 'server']
}