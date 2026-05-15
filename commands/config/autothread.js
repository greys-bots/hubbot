import frame from 'frame';
const { Models: { SlashCommand } } = frame;
import { ApplicationCommandOptionType as ACOT, ChannelType as CT } from 'discord.js';

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: "autothread",
			description: "Set whether threads should automatically be created on submissions",
			options: [
				{
					name: 'value',
					description: "The value to set",
					type: ACOT.String,
					choices: [
						{
							name: 'enabled',
							value: 'enabled'
						},
						{
							name: 'disabled',
							value: 'disabled'
						}
					],
					required: false
				}
			],
			usage: [
				"- View the current setting",
				"[value] - Enable or disable the setting"
			],
			permissions: ['ManageMessages'],
			guildOnly: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var config = await this.#stores.configs.get(ctx.guild.id);
		var value = ctx.options.getString('value');

		if(!value) {
			return {embeds: [{
				title: 'Autothread status',
				description: `${config.autothread ? 'True' : 'False'}`
			}]}
		}

		config.autothread = value == 'enabled' ? true : false;
		await config.save();

		return "Config set!";
	}
}

export default (bot, stores) => new Command(bot, stores);