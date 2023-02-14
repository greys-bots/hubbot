const { Models: { SlashCommand } } = require('frame');
const { ApplicationCommandOptionType: ACOT, ChannelType: CT } = require('discord.js');

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
					description: "The channel to set",
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
		var chan = ctx.options.getChannel('channel');

		if(!chan) {
			return {embeds: [{
				title: 'Submission channel',
				description: `${config.submission_channel ? `<#${config.submission_channel}>` : '(not set)'}`
			}]}
		}

		config.submission_channel = chan.id;
		await config.save();

		return "Channel set!";
	}
}

module.exports = (bot, stores) => new Command(bot, stores);