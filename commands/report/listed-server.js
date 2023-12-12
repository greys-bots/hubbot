const { Models: { SlashCommand } } = require('frame');
const { ApplicationCommandOptionType: ACOT, ChannelType: CT } = require('discord.js');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: "listed-server",
			description: "Report a listed server",
			options: [
				{
					name: 'id',
					description: 'The ID of the server',
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
		var sub = await this.#stores.submissions.get(ctx.guild.id, id);
		if(!sub) sub = await this.#stores.submissions.getByServerID(ctx.guild.id, id);
		if(!sub) return (
			"The ID given does not match a listed server. " +
			"You can use either the server's Discord-provided ID, or the hid " + 
			"present on a post in this server."
		);

		var res = await this.#bot.handlers.report.report({
			type: 'listed-server',
			name: sub.name,
			object_id: sub.server_id,
			guild: ctx.guild,
			user: ctx.user
		});
		return res;
	}
}

module.exports = (bot, stores) => new Command(bot, stores);