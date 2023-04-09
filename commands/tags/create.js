const { Models: { SlashCommand } } = require('frame');
const { ApplicationCommandOptionType: ACOT, ChannelType: CT } = require('discord.js');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: "create",
			description: "Create a new tag",
			options: [
				{
					name: 'name',
					description: "The name of the tag",
					type: ACOT.String,
					required: true
				},
				{
					name: 'description',
					description: "The description of the tag",
					type: ACOT.String,
					required: true
				}
			],
			usage: [
				"[name] [description] - Creates a new tag"
			],
			guildOnly: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var name = ctx.options.getString('name').trim();
		var description = ctx.options.getString('description').trim();

		var exists = await this.#stores.tags.checkExisting(ctx.guild.id, name.toLowerCase());
		if(exists) return "A tag with that name already exists.";

		await this.#stores.tags.create({
			server_id: ctx.guild.id,
			name,
			description
		})

		return "Tag created.";
	}
}

module.exports = (bot, stores) => new Command(bot, stores);