const {
	ComponentType: CT,
	TextInputStyle: TIS,
	InteractionType: IT
} = require('discord.js');

const { buttons: BTNS } = require('../extras')

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
	log: (data) => {
		return {
			title: "User(s) Banned",
			fields: [
				{
					name: `Name${data.users.length > 1 ? 's' : ''}`,
					value: data.users.map(x => x.name).join("\n")
				},
				{
					name: `ID${data.users.length > 1 ? 's' : ''}`,
					value: data.users.map(x => x.id).join("\n")
				},
				{
					name: 'Reason',
					value: data.reason
				}
			],
			footer: {
				text: `Log ID: ${data.hid}`
			}
		}
	}
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

class BanHandler {
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
		users
	}) {
		var cfg = await this.stores.configs.get(ctx.guild.id);

		var m = await this.bot.utils.awaitModal(
			ctx,
			MODALS.reason(ctx),
			ctx.user,
			false,
			5 * 60_000
		)
		if(!m) return "No data given.";
		var reason = m.fields.getField('reason').value.trim();

		var md = await m.fetchReply();
		await md.delete();

		var users = [];
		var errs = [];
		for(var u of data.users) {
			try {
				if(typeof u == string) {
					u = await this.bot.users.fetch(u);
				}

				await u.ban(reason.slice(0, 256));
				users.push({ name: u.tag, id: u.id });
			} catch(e) {
				console.log(e.message ?? e);
				errs.push(u.id ?? u);
				continue;
			}
		}

		var sub = await this.stores.bans.create({
			host: ctx.guild.id,
			user_ids: users.map(x => x.id),
			reason
		})

		var channel;
		try {
			channel = await ctx.guild.channels.fetch(cfg?.ban_channel);
		} catch(e) {
			console.log(e.message ?? e);
			channel = ctx.channel
		}
		
		var msg = await channel.send({
			...this.genPost({
				...sub,
				users,
				timestamp: new Date()
			}, "log"),
			components: BUTTONS.post()
		});

		var post = await this.stores.banPosts.create({
			server_id: ctx.guild.id,
			channel_id: channel.id,
			message_id: msg.id,
			log: sub.hid
		})

		return {
			content: "Users have been banned.",
			ephemeral: true
		};
	}

	genPost(data, type) {
		return {embeds: [POSTS[type](data)]};
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

module.exports = (bot) => new BanHandler(bot);
