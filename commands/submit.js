const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: "submit",
			description: "Submit a server for review",
			usage: [
				"- Opens a dialogue to submit your server"
			],
			ephemeral: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var res = await this.#bot.handlers.server.submission(ctx);
		return res;
	}
}

module.exports = (bot, stores) => new Command(bot, stores);