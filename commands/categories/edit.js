const { Models: { SlashCommand } } = require('frame');
const { ApplicationCommandOptionType: ACOT, ChannelType: CT } = require('discord.js');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: "edit",
			description: "Edit an existing category",
			options: [
				{
					name: 'category',
					description: "The category to edit",
					type: ACOT.String,
					required: true
				},
				{
					name: 'name',
					description: "The name of the category",
					type: ACOT.String,
					required: false
				},
				{
					name: 'description',
					description: "The description of the category",
					type: ACOT.String,
					required: false
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
					required: false
				}
			],
			usage: [
				"[category] [name] [description] [channel] - Edits a category"
			],
			guildOnly: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var hid = ctx.options.getString('category').trim();
		var category = await this.#stores.categories.get(ctx.guild.id, hid);
		if(!category?.id) return "Category not found.";

		var name = ctx.options.getString('name')?.trim() ?? category.name;
		var description = ctx.options.getString('description')?.trim() ?? category.description;
		var channel = ctx.options.getChannel('channel')?.id ?? category.channel;

		var exists = await this.#stores.categories.checkExisting(ctx.guild.id, name.toLowerCase());
		if(exists && exists.hid !== category.hid) return "A category with that name already exists.";
		exists = await this.#stores.categories.getByChannel(ctx.guild.id, channel);
		if(exists?.id && exists.hid !== category.hid) return "A category with that channel already exists.";

		category.name = name;
		category.description = description;
		category.channel = channel;
		await category.save()

		return "Category edited.";
	}

	async auto(ctx) {
		var foc = ctx.options.getFocused();

		var categories = await this.#stores.categories.getAll(ctx.guild.id);
		if(!categories?.length) return [];

		if(foc) {
			categories = categories.filter(x => (
				x.name.toLowerCase().includes(foc.toLowerCase()) ||
				x.description.toLowerCase().includes(foc.toLowerCase())
			))
			if(!categories.length) return [];
		}

		return categories.map(c => ({
			name: c.name,
			value: c.hid
		}))
	}
}

module.exports = (bot, stores) => new Command(bot, stores);