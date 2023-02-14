const { Models: { SlashCommand } } = require('frame');
const { ApplicationCommandOptionType: ACOT, ChannelType: CT } = require('discord.js');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: "channel",
			description: "Set the channel for submissions",
			options: [
				{
					name: 'channel',
					description: "The channel to set",
					type: ACOT.Channel,
					channel_types: [
						CT.GuildText,
						CT.GuildNews,
						CT.GuildNewsThread,
						CT.GuildPrivateThread,
						CT.GuildPublicThread
					],
					required: false
				}
			],
			usage: [
				"- View the current channel",
				"[channel] - Set a new channel"
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