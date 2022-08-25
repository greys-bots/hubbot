const {
	ComponentType: CT,
	TextInputStyle: TIS,
	InteractionType: IT
} = require('discord.js');

const MODALS = {
	serverInfo(ctx) {
		return {
			title: "Submit a Server",
			custom_id: `${ctx.guild.id}-${ctx.user.id}`,
			components: [
				{
					type: CT.ActionRow,
					components: [{
						type: CT.TextInput,
						custom_id: 'link',
						label: 'Server link',
						style: TIS.Short,
						min_length: 1,
						max_length: 100,
						required: true
					}]
				},
				{
					type: CT.ActionRow,
					components: [{
						type: CT.TextInput,
						custom_id: 'description',
						label: 'Server Description',
						style: TIS.Paragraph,
						min_length: 1,
						max_length: 2000,
						required: true
					}]
				},
				
			]
		}
	}
}

class ServerHandler {
	menus = new Map();

	constructor(bot) {
		this.bot = bot;
		this.stores = bot.stores;
	}

	async submission(ctx) {
		var cfg = await this.stores.configs.get(ctx.guild.id);
		if(!cfg?.submission_channel)
			return "No submission channel set. Please ask the mods to set one.";

		var link = m.fields.getField('link').value.trim()
		var guild = await this.bot.fetchInvite(link);

		var categories = await this.stores.categories.getAll(ctx.guild.id);
		var tags = await this.stores.tags.getAll(ctx.guild.id);
		
		var m = await this.bot.utils.awaitModal(
			ctx,
			MODALS.serverInfo(ctx),
			ctx.user,
			false,
			5 * 60_000
		)
		if(!m) return "No data given!";

		var sub = await this.stores.submissions.create({
			name: guild.name,
			description: m.fields.getField('description').value.trim(),
			link,
			user_id: ctx.user.id,
			host: ctx.guild.id,
			server_id: guild.id
		})

		if(categories?.length) {
			var cts = await this.bot.utils.awaitSelection(
				ctx,
				categories.map(c => ({
					label: c.name,
					description: c.description,
					value: c.hid
				})),
				"Which category best fits your server?",
				{
					min_values: 1, max_values: 1,
					placeholder: "Select a category"
				}
			)

			if(typeof cts == 'string') return cts;
			sub.category = cts[0];
			await sub.save();
		}

		if(tags?.length) {
			var tags = await this.bot.utils.awaitSelection(
				ctx,
				tags.map(t => ({
					label: t.name,
					description: t.description,
					value: t.hid
				})),
				"Which tags best fit your server?",
				{
					min_values: 1, max_values: 1,
					placeholder: "Select tags"
				}
			)

			if(typeof tags == 'string') return tags;
			sub.tags = tags[0];
			await sub.save();
		}

		var channel = await ctx.guild.channels.fetch(cfg.submissions_channel);

		var msg = await channel.send(this.genPost(sub));
		var post = await this.stores.subPosts.create({
			server_id: ctx.guild.id,
			channel_id: channel.id,
			message_id: msg.id,
			submission: sub.hid
		})

		return "Submission received. Please wait while a moderator reviews it.";
	}

	genPost(sub, user) {
		return {embeds: [{
			title: sub.name,
			description: sub.description,
			fields: [
				{
					name: "Category",
					value: (
						sub.category ?
						sub.category :
						"(not set)"
					)
					
				},
				{
					name: "Tags",
					value: (
						sub.tags?.length ?
						sub.tags.join(", ") :
						"(not set)"
					)
				}
			],
			author: {
				name: user.tag,
				icon_url: user.avatarURL()
			},
			footer: {
				text: `Server ID: ${sub.hid}`
			}
		}]}
	}
}

module.exports = (bot) => new ServerHandler(bot);