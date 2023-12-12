const { Models: { SlashCommand } } = require('frame');
const { ApplicationCommandOptionType: ACOT, ChannelType: CT } = require('discord.js');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: "user",
			description: "Report a user",
			options: [
				{
					name: 'id',
					description: 'The ID of the server',
					type: ACOT.String,
					required: true
				}
			],
			usage: [
				"[id] - Opens a dialogue to report a user"
			],
			ephemeral: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var id = ctx.options.getString('id').trim();
		try {
			var us = await this.#bot.users.fetch(id);
		} catch(e) {
			console.log(e.message ?? e);
			return "That is not a valid user ID."
		}

		var res = await this.#bot.handlers.report.report({
			type: 'user',
			name: us.username,
			object_id: us.id,
			guild: ctx.guild,
			user: ctx.user
		});
		return res;
	}
}

module.exports = (bot, stores) => new Command(bot, stores);