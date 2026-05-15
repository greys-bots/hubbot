import frame from 'frame';
const { Models: { SlashCommand } } = frame;
import { ApplicationCommandOptionType as ACOT, ChannelType as CT } from 'discord.js';

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: "report",
			description: "Report a resource or user",
			usage: [
				"- Opens a dialogue to submit a report"
			],
			ephemeral: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var res = await this.#bot.handlers.report.report(ctx, {});
		return res;
	}
}

export default (bot, stores) => new Command(bot, stores);