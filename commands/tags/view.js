const { Models: { SlashCommand } } = require('frame');
const { ApplicationCommandOptionType: ACOT } = require('discord.js');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: "view",
			description: "View existing tags",
			options: [
				{
					name: 'tag',
					description: "The tag to view",
					type: ACOT.String,
					required: false,
					autocomplete: true
				}
			],
			usage: [
				"- View all tags",
				"[tag] - View a specific tag"
			],
			guildOnly: true,
			ephemeral: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var val = ctx.options.getString('tag')?.trim();
		
		if(val) {
			var tag = await this.#stores.tags.get(ctx.guild.id, val);
			if(!tag?.id) return "Tag not found.";

			var stats = await tag.getStats();

			return {embeds: [{
				title: tag.name,
				description: tag.description,
				fields: [{
					name: 'Server count',
					value: stats.count.toString()
				}]
			}]}
		}

		var tags = await this.#stores.tags.getAll(ctx.guild.id);
		if(!tags?.length) return "No tags registered.";

		var embeds = await this.#bot.utils.genEmbeds(this.#bot, tags, (t) => ({
			name: t.name,
			value: t.description
		}), { title: 'Server tags' }, 10)

		return embeds.map(e => (e.embed))
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
		}))
	}
}

module.exports = (bot, stores) => new Command(bot, stores);