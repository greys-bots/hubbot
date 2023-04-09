const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: "add",
			description: "Manually add a new server to listings",
			
			usage: [
				"- Runs a menu to add a new server"
			],
			guildOnly: true,
			permissions: ['ManageMessages']
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		if(!ctx.member.permissions.has('ManageMessages')) return "You don't have permission to use this command.";
		
		var res = await this.#bot.handlers.server.addition(ctx);
		return res;
	}
}

module.exports = (bot, stores) => new Command(bot, stores);