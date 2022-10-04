const { Models: { SlashCommand } } = require('frame');
const { ApplicationCommandOptionType: ACOT, ChannelType: CT } = require('discord.js');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: "add",
			description: "Manually a new server to listings",
			usage: [
				"- Runs a menu to add a new server"
			],
			guildOnly: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		// TODO: add a function in the server handler for this
	}
}

module.exports = (bot, stores) => new Command(bot, stores);