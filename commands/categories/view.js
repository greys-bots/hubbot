const { Models: { SlashCommand } } = require('frame');
const { ApplicationCommandOptionType: ACOT } = require('discord.js');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: "view",
			description: "View existing categories",
			options: [
				{
					name: 'category',
					description: "The category to view",
					type: ACOT.String,
					required: false,
					autocomplete: true
				}
			],
			usage: [
				"- View all categories",
				"[category] - View a specific category"
			],
			guildOnly: true,
			ephemeral: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var val = ctx.options.getString('category')?.trim();
		
		if(val) {
			var category = await this.#stores.categories.get(ctx.guild.id, val);
			if(!category?.id) return "Category not found.";

			var stats = await category.getStats();

			return {embeds: [{
				title: category.name,
				description: category.description,
				fields: [
					{
						name: 'Channel',
						value: `<#${category.channel}>`
					},
					{
						name: 'Server count',
						value: stats.count.toString()
					}
				]
			}]}
		}

		var categories = await this.#stores.categories.getAll(ctx.guild.id);
		if(!categories?.length) return "No categories registered.";

		var embeds = await this.#bot.utils.genEmbeds(this.#bot, categories, (c) => ({
			name: c.name,
			value: c.description
		}), { title: 'Server categories' }, 10)

		return embeds.map(e => (e.embed))
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