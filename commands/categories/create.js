const { Models: { SlashCommand } } = require('frame');
const { ApplicationCommandOptionType: ACOT } = require('discord.js');

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
				},
				{
					name: 'channel',
					description: "The channel associated with this category",
					type: ACOT.Channel,
					channel_types: [
						CT.GuildText,
						CT.GuildNews,
						CT.GuildNewsThread,
						CT.GuildPrivateThread,
						CT.GuildPublicThread
					],
					required: true
				}
			],
			usage: [
				"[name] [description] [channel] - Creates a new tag"
			],
			guildOnly: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var name = ctx.options.getString('name').value.trim();
		var description = ctx.options.getString('description').value.trim();
		var channel = ctx.options.getChannel('channel').id;

		var exists = await this.#stores.categories.checkExisting(ctx.guild.id, name.toLowerCase());
		if(exists) return "A category with that name already exists.";
		exists = await this.#stores.categories.getByChannel(ctx.guild.id, channel);
		if(exists) return "A category with that channel already exists.";

		await this.#stores.tags.create({
			server_id: ctx.guild.id,
			name,
			description,
			channel
		})

		return "Category created.";
	}
}

module.exports = (bot, stores) => new Command(bot, stores);