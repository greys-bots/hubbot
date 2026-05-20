import {
	ComponentType as CT,
	TextInputStyle as TIS,
	InteractionType as IT,
	MessageFlags,
} from 'discord.js';

import { buttons as BTNS } from '../extras.js';

const MODALS = {
	reason: (value) => ({
		title: "Ban reason",
		custom_id: 'ban_reason',
		components: [{
			type: 1,
			components: [{
				type: 4,
				custom_id: 'reason',
				style: 2,
				label: "Enter the reason below",
				min_length: 1,
				max_length: 1024,
				required: true,
				placeholder: "Big meanie :(",
				value
			}]
		}]
	})
}

const POSTS = {
	log: (data) => ([
						{
			type: 17,
			accent_color: 0xaa5555,
			components: [
				{
					type: 10,
					content: '# Ban Log'
				},
				{
					type: 10,
					content: `## Users Banned\n${data.users.map(x => `${x} (${x.username} / ${x.id})`).join('\n')}`
				},
				{
					type: 10,
					content: `## Reason\n${data.reason}`
				}
			]
		},
		{
			type: 10,
			content: `-# ID: \`${data.hid}\` | Timestamp: ${data.timestamp}`
		}
	])
}

const BUTTONS = {
	post(id) {
		return [{
			type: 1,
			components: [
				{
					type: 2,
					style: 3,
					custom_id: `raw`,
					label: "Raw IDs",
					emoji: '📝'
				}
			]
		}]
	}
}

export class BanHandler {
	menus = new Map();

	constructor(bot) {
		this.bot = bot;
		this.stores = bot.stores;

		/*this.bot.on('interactionCreate', (intr) => {
			if(intr.type !== IT.MessageComponent) return;
			if(intr.componentType !== CT.Button) return;
			this.handleButtons(intr);
		})*/
	}

	async ban(ctx, data = {
		//users, reason
	}) {
		var cfg = await this.stores.configs.get(ctx.guild.id);
		let banLogs, modLogs;

		try {
			banLogs = await ctx.guild.channels.fetch(cfg.ban_logs);
		} catch(e) {
			console.error(`Couldn't fetch banlogs channel: \`${e.message ?? e}\``)
			banLogs = ctx.channel;
		}

		try {
			modLogs = await ctx.guild.channels.fetch(cfg.mod_logs);
		} catch(e) {
			console.error(`Couldn't fetch modlogs channel: \`${e.message ?? e}\``)
			modLogs = ctx.channel;
		}

		console.log(banLogs, modLogs);

		let reason = data.reason;
		if(!reason?.length) {
			var m = await this.bot.utils.awaitModal(
				ctx,
				MODALS.reason(ctx),
				ctx.user,
				false,
				5 * 60_000
			)
			if(!m) return "No data given.";
			reason = m.fields.getField('reason').value.trim();

			var md = await m.fetchReply();
			await md.delete();
		}
		
		let ids = [];
		let users = [];
		for(var u of data.users) {
			if(typeof u == 'string') {
				let user = await this.bot.users.fetch(u);
				ids.push(u);
				users.push(user)
			} else {
				users.push(u);
				ids.push(u.id)
			}
		}

		let result;
		try {
			result = await ctx.guild.members.bulkBan(ids, { reason });
		} catch(e) {
			console.error(e)
		}

		if(!result?.bannedUsers?.length) return { success: false, successful: [], failed: result?.failedUsers ?? ids };

		let banned = users.filter(x => result.bannedUsers.includes(x.id));

		var sub = await this.stores.bans.create({
			host: ctx.guild.id,
			user_ids: ids,
			reason
		})
		
		var msg = await banLogs.send({
			flags: [MessageFlags.IsComponentsV2],
			components: [
				...this.genPost({
					...sub,
					users,
					timestamp: this.bot.utils.formatTime()
				}, "log"),
				...BUTTONS.post()
			]
		});

		var post = await this.stores.banPosts.create({
			server_id: ctx.guild.id,
			channel_id: banLogs.id,
			message_id: msg.id,
			log: sub.hid
		})

		await modLogs.send({
			flags: [MessageFlags.IsComponentsV2],
			components: [
				{
					type: 17,
					accent_color: 0xaaffff,
					components: [
						{
							type: 10,
							content: '# Ban Executed'
						},
						{
							type: 10,
							content: [
								'## Moderator',
								`${ctx.user} (${ctx.user.username} / ${ctx.user.id})`,
								'## Banned Users',
								'```',
								ids.join(" "),
								"```"
							].join("\n")
						}
					]
				},
				{
					type: 10,
					content: `-# Timestamp: ${this.bot.utils.formatTime()}`
				}
			]
		})

		return {
			success: true,
			successful: result.bannedUsers,
			failed: result.failedUsers
		};
	}

	genPost(data, type) {
		return POSTS[type](data);
	}

	async handleButtons(ctx) {
		var post = await this.stores.banPosts.get(ctx.guild.id, ctx.message.id);
		if(!post?.id) return;
		await ctx.deferUpdate();
		var msg = ctx.message;

		var ban = await this.stores.bans.get(ctx.guild.id, post.log);
		if(!ban?.id) return await ctx.update({content: 'Ban deleted, post no longer needed.', embeds: [], components: []});
		
		var embed = msg.embeds[0].toJSON()
		switch(ctx.customId) {
			case 'raw':
				return await ctx.user.send(`**Raw IDs for ban ${ban.hid}:**\n` + ban.user_ids.join("\n"));
				break;
		}
	}
}

export default (bot) => new BanHandler(bot);
