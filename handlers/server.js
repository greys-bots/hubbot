import {
	ComponentType as CT,
	TextInputStyle as TIS,
	InteractionType as IT
} from 'discord.js';

import { buttons as BTNS } from '../extras.js';

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
						placeholder: 'https://discord.gg/invite',
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
						placeholder: 'Fun friendly server for all!',
						style: TIS.Paragraph,
						min_length: 1,
						max_length: 2000,
						required: true
					}]
				},
				{
					type: CT.ActionRow,
					components: [{
						type: CT.TextInput,
						custom_id: 'banner',
						label: 'Server banner url',
						placeholder: 'https://example.com/image.png',
						style: TIS.Short,
						max_length: 128,
						required: false
					}]
				}
			]
		}
	},
	edit(ctx, srv) {
		return {
			title: "Edit a server",
			custom_id: `${ctx.guild.id}-${ctx.user.id}`,
			components: [
				{
					type: CT.ActionRow,
					components: [{
						type: CT.TextInput,
						custom_id: 'name',
						label: 'Server name',
						style: TIS.Short,
						min_length: 1,
						max_length: 100,
						value: srv.name,
						required: true
					}]
				},
				{
					type: CT.ActionRow,
					components: [{
						type: CT.TextInput,
						custom_id: 'description',
						label: 'Server description',
						style: TIS.Paragraph,
						min_length: 1,
						max_length: 2000,
						value: srv.description,
						required: true
					}]
				},
				{
					type: CT.ActionRow,
					components: [{
						type: CT.TextInput,
						custom_id: 'link',
						label: 'Server link',
						style: TIS.Short,
						min_length: 1,
						max_length: 100,
						value: srv.link,
						required: true
					}]
				},
				{
					type: CT.ActionRow,
					components: [{
						type: CT.TextInput,
						custom_id: 'icon_url',
						label: 'Server icon',
						style: TIS.Short,
						min_length: 1,
						max_length: 2000,
						value: srv.icon_url,
						required: true
					}]
				},
			]
		}
	},
	deny: (value) => ({
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
	}),
}

const POSTS = {
}

const BUTTONS = {
	editPost(id) {
		return [{
			type: 1,
			components: [
				{
					type: 2,
					style: 3,
					custom_id: `ep-${id}-accept`,
					label: "Accept edit",
					emoji: '✅'
				},
				{
					type: 2,
					style: 4,
					custom_id: `ep-${id}-deny`,
					label: "Deny edit",
					emoji: '❌'
				}
			]
		}]
	}
}

export class ServerHandler {
	menus = new Map();

	constructor(bot) {
		this.bot = bot;
		this.stores = bot.stores;

		this.bot.on('interactionCreate', (intr) => {
			if(intr.type !== IT.MessageComponent) return;
			if(intr.componentType !== CT.Button) return;
			if(intr.customId.startsWith('edit-')) return this.handleEdit(intr);
			if(intr.customId.startsWith('ep-')) return this.handleEditButtons(intr);
			this.handleSubmissionButtons(intr);
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
		if(!m) return "No data given.";

		var link = m.fields.getField('link').value.trim();
		var inv, guild;
		try {
			inv = await this.bot.fetchInvite(link);
			guild = inv.guild;
		} catch(e) { }

		if(!guild) {
			return "Please provide a valid invite.";
		}

		var md = await m.fetchReply();
		await md.delete();

		var sub = await this.stores.submissions.create({
			host: ctx.guild.id,
			server_id: guild.id,
			user_id: ctx.user.id,
			name: guild.name,
			description: m.fields.getField('description').value.trim(),
			link: `https://discord.gg/${inv.code}`,
			icon_url: guild.iconURL({dynamic: true}),
			banner_url: m.fields.getField('banner').value.trim(),
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
				min_values: 1, max_values: cfg.multicategory ? categories.length : 1,
				placeholder: "Select category"
			},
			true
		)

		if(cts.err) return cts.err;
		sub.category = cts.values;
		await sub.save();
		await sub.getCategory();
		await cts.inter.deleteReply();

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
				},
				true
			)

			if(tgs.err) return tgs;
			sub.tags = tgs.values;
			await sub.save();
			await sub.getTags();
			await tgs.inter.deleteReply();
		}

		var channel = await ctx.guild.channels.fetch(cfg.submission_channel);

		var msg = await channel.send({
			flags: ['IsComponentsV2'],
			components: [
				...(await sub.genPost({ timestamp: new Date(), categories: true })),
				...BTNS.SUB(false)
			]
		});

		var post = await this.stores.submissionPosts.create({
			server_id: ctx.guild.id,
			channel_id: channel.id,
			message_id: msg.id,
			submission: sub.hid
		})

		return {
			content: "Submission received. Please wait while a moderator reviews it.",
			ephemeral: true
		};
	}

	async addition(ctx) {
		var cfg = await this.stores.configs.get(ctx.guild.id);
		var categories = await this.stores.categories.getAll(ctx.guild.id);
		if(!categories?.length) return "Categories must be set up before submissions can be added.";
		var tags = await this.stores.tags.getAll(ctx.guild.id);

		var m = await this.bot.utils.awaitModal(
			ctx,
			MODALS.serverInfo(ctx),
			ctx.user,
			false,
			5 * 60_000
		)
		if(!m) return "No data given.";

		var link = m.fields.getField('link').value.trim();
		var inv, guild;
		try {
			inv = await this.bot.fetchInvite(link);
			guild = inv.guild;
		} catch(e) { }

		if(!guild) {
			return "Please provide a valid invite.";
		}

		var md = await m.fetchReply();
		await md.delete();

		var sub = await this.stores.submissions.create({
			host: ctx.guild.id,
			server_id: guild.id,
			user_id: ctx.user.id,
			name: guild.name,
			description: m.fields.getField('description').value.trim(),
			link: `https://discord.gg/${inv.code}`,
			icon_url: guild.iconURL({dynamic: true}),
			banner_url: m.fields.getField('banner').value.trim(),
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
				min_values: 1, max_values: cfg?.multicategory ? categories.length : 1,
				placeholder: "Select category"
			},
			true
		)

		if(cts.err) return cts.err;
		sub.category = cts.values;
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
				},
				true
			)

			if(tgs.err) return tgs;
			sub.tags = tgs.values;
			await sub.save();
			await sub.getTags();
			await tgs.message.delete();
		}

		for(var c of sub.resolved.category) {
			let channel = await ctx.guild.channels.fetch(c.channel);
			let msg = await channel.send({
				flags: ['IsComponentsV2'],
				components: (await sub.genPost())
			});
			await this.stores.posts.create({
				server_id: ctx.guild.id,
				channel_id: channel.id,
				message_id: msg.id,
				submission: sub.hid
			})
		}

		return {
			content: "Submission created and posted.",
			ephemeral: true
		};
	}

	async handleSubmissionButtons(ctx) {
		var config = await this.stores.configs.get(ctx.guild.id);
		var post = await this.stores.submissionPosts.get(ctx.guild.id, ctx.message.id);
		if(!post?.id) return;
		await ctx.deferUpdate();
		var msg = ctx.message;

		var submission = await this.stores.submissions.get(ctx.guild.id, post.submission);
		if(!submission?.id) return await ctx.update({content: 'Submission deleted, post no longer needed.', embeds: [], components: []});
		await submission.getCategory();
		await submission.getTags();

		var embed = msg.components[0].toJSON();
		var rest = msg.components.slice(1, msg.components.length - 1).map(x => x.toJSON());

		var mlogs, dlogs;
		if(config.mod_logs) {
			mlogs = await ctx.guild.channels.fetch(config.mod_logs);
		}
		if(config.deny_logs) {
			dlogs = await ctx.guild.channels.fetch(config.deny_logs);
		}
		switch(ctx.customId) {
			case 'accept':
				var channels = [];
				for(var c of submission.resolved.category) {
					try {
						var channel = await ctx.guild.channels.fetch(c.channel);
						channels.push(channel)
					} catch(e) { }
					if(!channel) return ctx.followUp("Category channel wasn't found. Please update the category this submission belongs to.");
				}
				embed.accent_color = 0x55aa55;

				for(var c of channels) {
					var m = await c.send({
						flags: ['IsComponentsV2'],
						components: (await submission.genPost())
					});
					await msg.edit({components: [
						embed,
						...rest,
						{
							type: 10,
							content: `-# Submission accepted by ${ctx.user} (${ctx.user.id})`
						}
					]});
					await this.stores.posts.create({
						server_id: ctx.guild.id,
						channel_id: channel.id,
						message_id: m.id,
						submission: submission.hid
					})
					await post.delete();
				}

				if(mlogs) {
					await mlogs.send({
						flags: ['IsComponentsV2'],
						components: [
							{
								type: 17,
								accent_color: 0x55aa55,
								components: [
									{
										type: 10,
										content: '## Submission Accepted'
									},
									{
										type: 14
									},
									{
										type: 10,
										content:
											`### Responsible Moderator\n${ctx.user} (${ctx.user.id})\n` +
											`### Submission\n${submission.name} (\`${submission.hid}\`) [(jump)](${msg.url})`
									},
									{
										type: 14
									},
									{
										type: 10,
										content: `-# Date: ${this.bot.utils.formatTime()}`
									}
								]
							}
						]
					})
				}
				break;
			case 'deny':
				try {
					var u2 = await this.bot.users.fetch(submission.user_id);
				} catch(e) { }

				var reason;
				var m = await msg.channel.send({
					flags: ['IsComponentsV2'],
					components: [
						{
							type: 17,
							accent_color: 0xaa5555,
							components: [{
								type: 10,
								content: 'Would you like to give a denial reason?'
							}]
						},
						...BTNS.DENY(false)
					]
				});

				var resp = await this.bot.utils.getChoice(this.bot, m, ctx.user, 2 * 60 * 1000, false);
				if(!resp.choice) return await ctx.followUp({content: 'Nothing selected.', ephemeral: true});
				switch(resp.choice) {
					case 'cancel':
						await m.delete()
						return resp.interaction.reply({content: 'Action cancelled.', ephemeral: true});
					case 'reason':
						var mod = await this.bot.utils.awaitModal(resp.interaction, MODALS.deny(reason), ctx.user, false, 5 * 60_000);
						if(mod) reason = mod.fields.getTextInputValue('reason')?.trim();
						var md = await mod.followUp("Modal received.");
						await md.delete()
						break;
					case 'skip':
						break;
				}

				await m.delete()

				embed.accent_color = 0xaa5555;

				try {
					await msg.edit({
						components: [
							embed,
							...rest,
							{
								type: 10,
								content: `-# Submission denied by ${ctx.user} (${ctx.user.id}) | **Reason:** ${reason ?? '(none given)'}`
							}
						]
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
					await submission.delete();
				} catch(e) {
					console.log(e);
					return await msg.channel.send('Error: Submission denied, but I couldn\'t message the user.');
				}

				if(mlogs) {
					await mlogs.send({
						flags: ['IsComponentsV2'],
						components: [
							{
								type: 17,
								accent_color: 0xaa5555,
								components: [
									{
										type: 10,
										content: '## Submission Denied'
									},
									{
										type: 14
									},
									{
										type: 10,
										content:
											`### Responsible Moderator\n${ctx.user} (${ctx.user.id})\n` +
											`### Submission\n${submission.name} (\`${submission.hid}\`) [(jump)](${msg.url})\n` +
											`### Reason\n${reason ?? "(none given)"}`
											
									},
									{
										type: 14
									},
									{
										type: 10,
										content: `-# Date: ${this.bot.utils.formatTime()}`
									}
								]
							}
						]
					})
				}

				if(dlogs) {
					await dlogs.send({
						flags: ['IsComponentsV2'],
						components: [
							{
								type: 17,
								accent_color: 0xaa5555,
								components: [
									{
										type: 10,
										content: '## Submission Denied'
									},
									{
										type: 14
									},
									{
										type: 10,
										content:
											`### Submission\n${submission.name} (\`${submission.hid}\`)\n` +
											`### Reason\n${reason ?? "(none given)"}`
									}
								]
							}
						]
					})
				}

				return await ctx.followUp({content: 'Submission denied.', ephemeral: true});
				break;
		}
	}

	async handleEdit(server, ctx) {
		var cfg = await this.stores.configs.get(ctx.guild.id);
		if(!cfg.requests) return 'No edit request channel set. Ask a mod to set one first.';

		var sub = await this.stores.submissions.get(ctx.guild.id, server);
		await sub.getTags();
		if(!ctx.member.permissions.has('ManageMessages')) {
			if(ctx.user.id !== sub.user_id)
				return "You don't have permission to edit that post.";
		}

		var prev = await this.stores.edits.getBySubmission(ctx.guild.id, server);
		if(prev?.length) return "There's already a pending edit request for that server.";

		var m = await this.bot.utils.awaitModal(
			ctx,
			MODALS.edit(ctx, sub),
			ctx.user,
			true,
			5 * 60_000
		)
		if(!m) return "No data received.";
		// var mx = await m.followUp({content: "Data received", ephemeral: true});
		// await mx.delete()

		var changes = {
			name: m.fields.getField('name').value.trim(),
			description: m.fields.getField('description').value.trim(),
			link: m.fields.getField('link').value.trim(),
			icon_url: m.fields.getField('icon_url').value.trim()
		}

		if(ctx.member.permissions.has('ManageMessages')) {
			for(var prop in changes) {
				sub[prop] = changes[prop];
			}
	
			await sub.save();
			var errs = await sub.updatePosts(ctx);
			if(errs.length) console.log(`Post update errors for ${sub.hid}:`, errs);
			return "Edit made.";
		} else {
			var ed = await this.stores.edits.create({
				host: ctx.guild.id,
				server_id: sub.hid,
				user_id: ctx.user.id,
				changes
			})
			
			var nm = changes.name;
			if(changes.name != sub.name) changes.name = nm + ` (previously ${sub.name})`;
			try {
				var chan = await ctx.guild.channels.fetch(cfg.requests);
				await chan.send({
					flags: ['IsComponentsV2'],
					components: [
						...(await sub.genPost({ changes, timestamp: new Date() })),
						...BUTTONS.editPost(ed.hid)
					]
				})
			} catch(e) {
				console.error(e);
				return "An error occurred. Please try again later.";
			}

			return "Your edit request has been received. Please wait while a mod reviews it.";
		}
	}

	async handleEditButtons(ctx) {
		var split = ctx.customId.split('-');
		var ed = await this.stores.edits.get(ctx.guild.id, split[1]);
		var sub = await this.stores.submissions.get(ctx.guild.id, ed.server_id);
		var posts = await sub.getPosts();
		var action = split[2];

		var edm = ctx.message.components[0].toJSON();
		switch(action) {
			case 'deny':
				try {
					var user = await this.bot.users.fetch(ed.user_id);
					await user.send({
						embeds: [{
							title: "Edit request denied",
							description: `Your edit request for ${sub.name} (${sub.hid}) has been denied.`,
							color: 0xaa5555
						}]
					})

					await ctx.update({
						components: [
							{
								...edm,
								accent_color: 0xaa5555,
							},
							{
								type: 10,
								content: `-# Submission denied by ${ctx.user} (${ctx.user.id})`
							}
						]
					})

					await ed.delete()
				} catch(e) {
					return await ctx.followUp({
						content: e.message ?? e,
						ephemeral: true
					})
				}
				break;
			case 'accept':
				try {
					var user = await this.bot.users.fetch(ed.user_id);
					await user.send({
						embeds: [{
							title: "Edit request accepted",
							description: `Your edit request for ${sub.name} (${sub.hid}) has been accepted!`,
							color: 0x55aa55
						}]
					})

					await ctx.update({
						components: [
							{
								...edm,
								accent_color: 0x55aa55,
							},
							{
								type: 10,
								content: `-# Submission accepted by ${ctx.user} (${ctx.user.id})`
							}
						]
					})

					for(var prop in ed.changes) {
						sub[prop] = ed.changes[prop];
					}
					
					await sub.save();
					var errs = await sub.updatePosts(ctx);
					if(errs.length) console.log(`Post update errors for ${sub.hid}:`, errs);
					await ed.delete();
				} catch(e) {
					return await ctx.followUp({
						content: e.message ?? e,
						ephemeral: true
					})
				}
				break;
		}
	}
}

export default (bot) => new ServerHandler(bot);