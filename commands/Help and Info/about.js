module.exports = {
	help: ()=> "A little about the bot",
	usage: ()=> [" - Just what's on the tin"],
	execute: async (bot, msg, args) => {
		msg.channel.createMessage({embed: {
			title: '**About**',
			fields:[
				{name: "Prefix", value: "`hub!command`"},
				{name: "Creator", value: "xSke [original python version] | greysdawn (GreySkies#9950/(gs)#6969) [current maintainers]"},
				{name: "Repo", value: "https://github.com/greys-bots/hubbot"},
				{name: "Creator's Patreon", value: "https://patreon.com/greysdawn"},
				{name: "Creator's Ko-Fi", value: "https://ko-fi.com/greysdawn"},
				{name: "Guilds", value: bot.guilds.size},
				{name: "Users", value: bot.users.size}
			]
		}})
	},
	alias: ['abt', 'a'],
	module: "utility"
}