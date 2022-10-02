const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'categories',
			description: "Commands for managing categories",
			guildOnly: true,
			permissions: ['ManageMessages'],
			opPerms: ['MANAGE_CONFIG']
		})
		this.#bot = bot;
		this.#stores = stores;
	}
}

module.exports = (bot, stores) => new Command(bot, stores);