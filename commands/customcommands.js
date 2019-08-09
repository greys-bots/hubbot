module.exports = {
	help: ()=> "Create custom commands",
	usage: ()=> [" - List current custom commands",
				 " create - Run a menu to create a new command",
				 " info [commandname] - Get info on a command",
				 " edit [commandname] - Edit a command",
				 " delete [commandname] - Delete a custom command"],
	execute: async (bot, msg, args) => {
		var cmds = bot.utils.getCustomCommands(bot, msg.guild.id);
		if(!cmds) return msg.channel.createMessage("No custom commands registered for this server");

		msg.channel.createMessage({
			embed: {
				title: "Custom commands",
				fields: []
			}
		})
	},
	alias: ["cc", "custom"],
	guildOnly: true,
	permissions: ["manageGuild"]
}