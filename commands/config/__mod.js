import frame from 'frame';
const { Models: { SlashCommand } } = frame;

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'config',
			description: "Commands for managing config settings",
			guildOnly: true,
			permissions: ['ManageMessages'],
			opPerms: ['MANAGE_CONFIG']
		})
		this.#bot = bot;
		this.#stores = stores;
	}
}

export default (bot, stores) => new Command(bot, stores);