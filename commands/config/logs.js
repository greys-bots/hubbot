const { Models: { SlashCommand } } = require('frame');
const { ApplicationCommandOptionType: ACOT, ChannelType: CT } = require('discord.js');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: "logs",
			description: "Set the channels needed for logging",
			options: [
				{
					name: 'deny-logs',
					description: "The channel to set for server denials and delistings",
					type: ACOT.Channel,
					channel_types: [
						CT.GuildText,
						CT.GuildNews,
						CT.GuildNewsThread,
						CT.GuildPrivateThread,
						CT.GuildPublicThread
					],
					required: false
				},
				{
					name: 'ban-logs',
					description: "The channel to set for ban logs",
					type: ACOT.Channel,
					channel_types: [
						CT.GuildText,
						CT.GuildNews,
						CT.GuildNewsThread,
						CT.GuildPrivateThread,
						CT.GuildPublicThread
					],
					required: false
				},
				{
					name: 'mod-logs',
					description: "The channel to set for mod actions and events",
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
				"- View the current logging channels",
				"[deny-logs] - Set a channel for deny logs",
				"[ban-logs] - Set a channel for ban logs",
				"[mod-logs] - Set a channel for mod logs",
			],
			permissions: ['ManageMessages'],
			guildOnly: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var config = await this.#stores.configs.get(ctx.guild.id);
		var deny = ctx.options.getChannel('deny-logs');
		var ban = ctx.options.getChannel('ban-logs');
		var mod = ctx.options.getChannel('mod-logs');

		if(!deny && !ban && !mod) {
			return {embeds: [{
				title: 'Log channels',
				description: (
					`**Denials:** ${config.deny_logs ? `<#${config.deny_logs}>` : '(not set)'}\n` +
					`**Bans:** ${config.ban_logs ? `<#${config.ban_logs}>` : '(not set)'}\n` +
					`**Modding:** ${config.mod_logs ? `<#${config.mod_logs}>` : '(not set)'}`
				)
			}]}
		}

		if(deny) config.deny_logs = deny.id;
		if(ban) config.ban_logs = ban.id;
		if(mod) config.mod_logs = mod.id;

		await config.save();

		return "Config updated!";
	}
}

module.exports = (bot, stores) => new Command(bot, stores);