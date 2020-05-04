module.exports = {
	help: ()=> "A bit about the bot",
	usage: ()=> [" - What it says on the tin"],
	execute: async (bot, msg, args) => {
		return {embed: {
			title: "About the bot",
			description: "Hi! I'm Hubbot! :D\nI'm the heavy lifter bot for Plural Hub"+
						 "\nHere's some more about me:",
			fields: [
				{name: "Creators", value: "[greysdawn](https://github.com/greysdawn) | (GS)#6969 (original by [xSke](https://github.com/xSke))"},
				{name: "Stats", value: `Guilds: ${bot.guilds.size} | Users: ${bot.users.size}`}
			]

		}};
	},
	alias: ["a", "abt"]
}