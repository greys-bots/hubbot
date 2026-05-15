import frame from 'frame';
const { Models: { SlashCommand } } = frame;

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'report-old',
			description: "Commands for submitting reports on servers or users",
			guildOnly: true,
			permissions: [],
			opPerms: []
		})
		this.#bot = bot;
		this.#stores = stores;
	}
}

export default (bot, stores) => new Command(bot, stores);