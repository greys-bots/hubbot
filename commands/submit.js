import frame from 'frame';
const { Models: { SlashCommand } } = frame;

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: "submit",
			description: "Submit a listing for review",
			usage: [
				"- Opens a dialogue to submit your listing"
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

export default (bot, stores) => new Command(bot, stores);