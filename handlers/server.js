const {
	ComponentType: CT,
	TextInputStyle: TIS,
	InteractionType: IT
} = require('discord.js');

const { buttons: BTNS } = require('../extras')

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
	},
	DENY: (value) => ({
		title: "Deny reason",
		custom_id: 'deny_reason',
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

class ServerHandler {
	menus = new Map();

	constructor(bot) {
		this.bot = bot;
		this.stores = bot.stores;

		this.bot.on('interactionCreate', (intr) => {
			if(intr.type !== IT.MessageComponent) return;
			if(intr.componentType !== CT.Button) return;
			this.handleButtons(intr);
			this.handleEdit(intr);
		})
	}

	async submission(ctx) {
		var cfg = await this.stores.configs.get(ctx.guild.id);
		if(!cfg?.submission_channel)
			return "No submission channel set. Please ask the mods to set one.";

		var categories = await this.stores.categories.getAll(ctx.guild.id);
		if(!categories?.length) return "Categories must be set up before submissions can be accepted.";

		var tags = await this.stores.tags.getAll(ctx.guild.id);
		
		var m = await this.bot.utils.awaitModal(
			ctx,
			MODALS.serverInfo(ctx),
			ctx.user,
			false,
			5 * 60_000
		)
		if(!m) return "No data given!";

		var link = m.fields.getField('link').value.trim();
		var inv, guild;
		try {
			inv = await this.bot.fetchInvite(link);
			guild = inv.guild;
		} catch(e) { }

		if(!guild) {
			await m.followUp("Please provide a valid invite.")
			return;
		}

		var sub = await this.stores.submissions.create({
			host: ctx.guild.id,
			server_id: guild.id,
			user_id: ctx.user.id,
			name: guild.name,
			description: m.fields.getField('description').value.trim(),
			link: `https://discord.gg/${inv.code}`,
			icon_url: guild.iconURL({dynamic: true})
		})

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

		if(cts.err) return cts.err;
		sub.category = cts.values[0];
		await sub.save();
		await sub.getCategory();
		await cts.message.delete();

		if(tags?.length) {
			var tgs = await this.bot.utils.awaitSelection(
				ctx,
				tags.map(t => ({
					label: t.name,
					description: t.description,
					value: t.hid
				})),
				"Which tags best fit your server?",
				{
					min_values: 1, max_values: tags.length,
					placeholder: "Select tags"
				}
			)

			if(tgs.err) return tgs;
			sub.tags = tgs.values;
			await sub.save();
			await sub.getTags();
			await tgs.message.delete();
		}

		var channel = await ctx.guild.channels.fetch(cfg.submission_channel);

		var msg = await channel.send({
			...this.genPost(sub, {
				user: ctx.user,
				category: sub.resolved.category,
				tags: sub.resolved.tags,
				timestamp: new Date()
			}),
			components: BTNS.SUB(false)
		});
		var post = await this.stores.submissionPosts.create({
			server_id: ctx.guild.id,
			channel_id: channel.id,
			message_id: msg.id,
			submission: sub.hid
		})

		await m.followUp({
			content: "Submission received. Please wait while a moderator reviews it.",
			ephemeral: true
		})

		return;
	}

	genPost(sub, extras = {}) {
		var res = {embeds: [{
			title: sub.name,
			description: sub.description,
			fields: [
				{
					name: 'Link',
					value: sub.link
				}
			],
			footer: {
				text: `Server ID: ${sub.hid}`
			},
			thumbnail: {
				url: sub.icon_url
			}
		}]}

		if(extras.category?.name) {
			res.embeds[0].fields.push({
				name: "Category",
				value: extras.category.name
			})
		}

		if(extras.tags?.length) {
			res.embeds[0].fields.push({
				name: "Tags",
				value: extras.tags.map(t => t.name).join(", ")
			})
		}

		if(extras.user) {
			res.embeds[0].author = {
				name: extras.user.tag,
				icon_url: extras.user.avatarURL()
			}
		}

		if(extras.timestamp) {
			res.embeds[0].timestamp = extras.timestamp;
		}

		return res;
	}

	async handleButtons(ctx) {
		var post = await this.stores.submissionPosts.get(ctx.guild.id, ctx.message.id);
		if(!post?.id) return;
		await ctx.deferUpdate();
		var msg = ctx.message;

		var submission = await this.stores.submissions.get(ctx.guild.id, post.submission);
		if(!submission?.id) return await ctx.update({content: 'Submission deleted, post no longer needed.', embeds: [], components: []});
		await submission.getCategory();
		await submission.getTags();

		var embed = msg.embeds[0].toJSON()
		switch(ctx.customId) {
			case 'accept':
				try {
					var channel = await ctx.guild.channels.fetch(submission.resolved.category.channel);
				} catch(e) { }
				if(!channel) return ctx.followUp("Category channel wasn't found. Please update the category this submission belongs to.");

				embed.color = 0x55aa55;
				embed.footer.text += ' | Submission accepted.';

				var m = await channel.send(this.genPost(submission, {
					tags: submission.resolved.tags
				}))
				await msg.edit({embeds: [embed], components: []});
				await this.stores.posts.create({
					server_id: ctx.guild.id,
					channel_id: channel.id,
					message_id: m.id,
					submission: submission.hid
				})
				await post.delete();
				break;
			case 'deny':
				try {
					var u2 = await this.bot.users.fetch(submission.user_id);
				} catch(e) { }

				var reason;
				var m = await msg.channel.send({
					embeds: [{
						title: 'Would you like to give a denial reason?'
					}],
					components: BTNS.DENY(false)
				});

				var resp = await this.bot.utils.getChoice(this.bot, m, ctx.user, 2 * 60 * 1000, false);
				if(!resp.choice) return await ctx.followUp({content: 'Nothing selected.', ephemeral: true});
				switch(resp.choice) {
					case 'cancel':
						await m.delete()
						return resp.interaction.reply({content: 'Action cancelled.', ephemeral: true});
					case 'reason':
						var mod = await this.bot.utils.awaitModal(resp.interaction, MODALS.DENY(reason), ctx.user, true, 5 * 60_000);
						if(mod) reason = mod.fields.getTextInputValue('reason')?.trim();
						await mod.followUp("Modal received.")
						break;
					case 'skip':
						break;
				}

				await m.delete()

				embed.color = 0xaa5555;
				embed.footer.text += ' | Submission denied.';
				embed.description += `\n\n**Denial reason:** ${reason ?? "*(no reason given)*"}`;

				try {
					await msg.edit({
						embeds: [embed],
						components: []
					});

					await u2.send({embeds: [{
						title: 'Submission denied.',
						description: [
							`Server: ${ctx.guild.name} (${ctx.guild.id})`,
							`Submission: ${submission.name}`
						].join("\n"),
						fields: [{name: 'Reason', value: reason ?? "*(no reason given)*"}],
						color: 0xaa5555,
						timestamp: new Date().toISOString()
					}]})

					await post.delete();
				} catch(e) {
					console.log(e);
					return await msg.channel.send('Error: Submission denied, but I couldn\'t message the user.');
				}

				return await ctx.followUp({content: 'Submission denied.', ephemeral: true});
				break;
		}
	}

	async handleEdit(ctx) {
		var post = await this.stores.posts.get(ctx.guild.id, ctx.message.id);
		if(!post?.id) return;

		
	}
}

module.exports = (bot) => new ServerHandler(bot);