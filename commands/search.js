const { Models: { SlashCommand } } = require('frame');
const { ApplicationCommandOptionType: ACOT, ChannelType: CT } = require('discord.js');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: "search",
			description: "Search through servers",
			options: [
				{
					name: 'query',
					description: 'A query to search for',
					type: ACOT.String,
					required: false
				},
				{
					name: 'tagged',
					description: "A tag to search through",
					type: ACOT.String,
					required: false,
					autocomplete: true
				},
				{
					name: 'category',
					description: "A category to search through",
					type: ACOT.String,
					required: false,
					autocomplete: true
				}
			],
			usage: [
				"- List all servers",
				"[query] - Search through servers using specific text",
				"[query] [tag] - Search through servers with a given tag",
				"[query] [tag] [category] - Narrow down searches to a specific category"

			],
			guildOnly: true,
			ephemeral: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var subs = await this.#stores.submissions.getAll(ctx.guild.id);
		if(!subs?.length) return "No submissions to search through.";

		var query = ctx.options.getString('query')?.trim().toLowerCase();
		var tag = ctx.options.getString('tagged')?.trim().toLowerCase();
		var cat = ctx.options.getString('cat')?.trim().toLowerCase();

		if(tag) {
			tag = await this.#stores.tags.get(ctx.guild.id, tag);
			if(!tag?.id) return "Tag not found.";
			tag = tag.hid;
		}

		if(cat) {
			cat = await this.#stores.categories.get(ctx.guild.id, cat);
			if(!cat?.id) return "Category not found.";
			cat = cat.hid;
		}

		var res = await this.#stores.submissions.search(ctx.guild.id, query, tag, cat);
		if(res?.length) {
			for(var s of res) await s.getTags();
			return res.map(x => x.genPost().embeds[0]);
		}
		else return "No matching submissions were found.";
	}

	async auto(ctx) {
		var foc = ctx.options.getFocused(true);
		console.log(foc);

		var res;
		var v = foc.value;
		switch(foc.name) {
			case 'tagged':
				var tags = await this.#stores.tags.getAll(ctx.guild.id);
				if(!tags?.length) return [];

				if(foc) {
					res = tags.filter(x => (
						x.name.toLowerCase().includes(v.toLowerCase()) ||
						x.description.toLowerCase().includes(v.toLowerCase())
					))
					if(!res.length) return [];
				}
				break;
			case 'category':
				var cats = await this.#stores.categories.getAll(ctx.guild.id);
				if(!cats?.length) return [];

				if(foc) {
					res = cats.filter(x => (
						x.name.toLowerCase().includes(v.toLowerCase()) ||
						x.description.toLowerCase().includes(v.toLowerCase())
					))
					if(!res.length) return [];
				}
				break;
		}

		return res.map(x => ({
			name: x.name,
			value: x.hid
		})).slice(0, 25)
	}
}

module.exports = (bot, stores) => new Command(bot, stores);