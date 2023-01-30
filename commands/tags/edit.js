const { Models: { SlashCommand } } = require('frame');
const { ApplicationCommandOptionType: ACOT, ChannelType: CT } = require('discord.js');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: "edit",
			description: "Edit an existing tag",
			options: [
				{
					name: 'tag',
					description: 'The tag to edit',
					type: ACOT.String,
					required: true,
					autocomplete: true
				},
				{
					name: 'name',
					description: "The name of the tag",
					type: ACOT.String,
					required: false
				},
				{
					name: 'description',
					description: "The description of the tag",
					type: ACOT.String,
					required: false
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
		var hid = ctx.options.getString('tag').trim();
		var tag = await this.#stores.tags.get(ctx.guild.id, hid);
		if(!tag?.id) return "Tag not found.";

		var name = ctx.options.getString('name')?.trim() ?? tag.name;
		var description = ctx.options.getString('description')?.trim() ?? tag.description;

		var exists = await this.#stores.tags.checkExisting(ctx.guild.id, name.toLowerCase());
		if(exists && exists.hid !== tag.hid) return "A tag with the new name already exists.";

		tag.name = name;
		tag.description = description;
		await tag.save();

		return "Tag edited.";
	}

	async auto(ctx) {
		var foc = ctx.options.getFocused();

		var tags = await this.#stores.tags.getAll(ctx.guild.id);
		if(!tags?.length) return [];

		if(foc) {
			tags = tags.filter(x => (
				x.name.toLowerCase().includes(foc.toLowerCase()) ||
				x.description.toLowerCase().includes(foc.toLowerCase())
			))
			if(!tags.length) return [];
		}

		return tags.map(t => ({
			name: t.name,
			value: t.hid
		})).slice(0, 25)
	}
}

module.exports = (bot, stores) => new Command(bot, stores);