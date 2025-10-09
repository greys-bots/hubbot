const { Models: { SlashCommand } } = require('frame');
const { ApplicationCommandOptionType: ACOT, ChannelType: CT } = require('discord.js');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: "unlisted-server",
			description: "Report a non-listed server",
			options: [
				{
					name: 'id',
					description: 'The ID of the server',
					type: ACOT.String,
					required: true
				},
				{
					name: 'name',
					description: 'The name of the server',
					type: ACOT.String,
					required: true
				}
			],
			usage: [
				"[id] - Opens a dialogue to report a server"
			],
			ephemeral: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var id = ctx.options.getString('id').trim();
		var name = ctx.options.getString('name').trim();

		var res = await this.#bot.handlers.report.report(ctx, {
			type: 'unlisted',
			name,
			object_id: id
		});
		return res;
	}
}

module.exports = (bot, stores) => new Command(bot, stores);