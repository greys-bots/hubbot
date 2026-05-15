import frame from 'frame';
const { Models: { SlashCommand } } = frame;

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'tags',
			description: "Commands for managing tags",
			guildOnly: true,
			permissions: ['ManageMessages'],
			opPerms: ['MANAGE_CONFIG']
		})
		this.#bot = bot;
		this.#stores = stores;
	}
}

export default (bot, stores) => new Command(bot, stores);