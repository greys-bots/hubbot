import {
	ComponentType as CT,
	TextInputStyle as TIS,
	InteractionType as IT,
	MessageFlags,
} from 'discord.js';

import { buttons as BTNS } from '../extras.js';
import { formatTime } from '../utils.js';

const MODALS = {
	report(ctx, data = { type: '', object_id: '', name: '' }) {
		return {
			title: "Report",
			custom_id: `${ctx.guild.id}-${ctx.user.id}`,
			components: [
				{
					type: CT.Label,
					label: "Report Type",
					description: "Please select whether you're reporting a user or a server.",
					component: {
						type: CT.StringSelect,
						custom_id: 'type',
						min_values: 1,
						max_values: 1,
						required: true,
						placeholder: "Select a type...",
						options: [
							{
								label: 'User',
								value: 'user',
								description: "I am reporting a user on Discord",
								default: (data.type == 'user' ? true : false)
							},
							{
								label: "Listed Resource",
								value: 'listed',
								description: "I am reporting a server/link that is listed with the hub",
								default: (data.type == 'listed' ? true : false)
							},
							{
								label: "Unlisted Resource",
								value: 'unlisted',
								description: "I am reporting a server/resource that is NOT listed with the hub",
								default: (data.type == 'unlisted' ? true : false)
							}
						]
					}
				},
				{
					type: CT.Label,
					label: "User/Server Name(s)",
					description: "Please share the name(s) of who/what you're reporting.",
					component: {
						type: CT.TextInput,
						custom_id: 'object-name',
						style: TIS.Short,
						min_length: 1,
						max_length: 100,
						required: true,
						value: data.name ?? null
					}
				},
				{
					type: CT.Label,
					label: "User/Server ID(s)",
					description: "Please share the ID(s) of who/what you're reporting.\nNOTE: We can't act on reports without an ID.",
					component: {
						type: CT.TextInput,
						custom_id: 'object-id',
						style: TIS.Paragraph,
						min_length: 1,
						max_length: 200,
						required: true,
						value: data.object_id ?? null,
						placeholder: 'If reporting multiple things, please put IDs on new lines! Example:\n1234567898765\n9876543212345'
					}
				},
				{
					type: CT.Label,
					label: "Report Reason",
					description: "Enter your reason for reporting below.",
					component: {
						type: CT.TextInput,
						custom_id: 'reason',
						style: TIS.Paragraph,
						min_length: 1,
						max_length: 2000,
						required: true
					}
				},
				{
					type: CT.Label,
					label: "Report Evidence",
					description: "Please enter links to any images of evidence you have for your report.",
					component: {
						type: CT.TextInput,
						custom_id: 'evidence',
						style: TIS.Paragraph,
						min_length: 1,
						max_length: 2000,
						required: true
					}
				}
			]
		}
	},
	reason: (value) => ({
		title: "Reason",
		custom_id: 'mod-reason',
		components: [{
			type: CT.Label,
			label: "Reason",
			description: "Enter the reason below",
			component: {
				type: 4,
				custom_id: 'reason',
				style: 2,
				min_length: 1,
				max_length: 1024,
				required: true,
				value
			}
		}]
	}),
	editUsers: (value) => ({
		title: "Edit Users",
		custom_id: 'edit-users',
		components: [{
			type: CT.Label,
			label: "User IDs",
			description: "Enter the user IDs to ban below.",
			component: {
				type: 4,
				custom_id: 'user-ids',
				style: 2,
				min_length: 1,
				max_length: 1024,
				required: true,
				value
			}
		}]
	}),
}

const POSTS = { }

const BUTTONS = {
	listed: (id) => {
		return [{
			type: 1,
			components: [
				{
					type: 2,
					style: 3,
					custom_id: `accept`,
					label: "Delist server",
					emoji: '✅'
				},
				{
					type: 2,
					style: 4,
					custom_id: `deny`,
					label: "Deny report",
					emoji: '❌'
				},
				{
					type: 2,
					style: 1,
					custom_id: `ticket`,
					label: "Open ticket",
					emoji: '🎟️'
				}
			]
		}]
	},
	unlisted: (id) => {
		return [{
			type: 1,
			components: [
				{
					type: 2,
					style: 3,
					custom_id: `accept`,
					label: "Blacklist server",
					emoji: '✅'
				},
				{
					type: 2,
					style: 4,
					custom_id: `deny`,
					label: "Deny report",
					emoji: '❌'
				},
				{
					type: 2,
					style: 1,
					custom_id: `ticket`,
					label: "Open ticket",
					emoji: '🎟️'
				}
			]
		}]
	},
	user(id) {
		return [{
			type: 1,
			components: [
				{
					type: 2,
					style: 3,
					custom_id: `accept`,
					label: "Ban user(s)",
					emoji: '✅'
				},
				{
					type: 2,
					style: 4,
					custom_id: `deny`,
					label: "Deny report",
					emoji: '❌'
				},
				{
					type: 2,
					style: 1,
					custom_id: `ticket`,
					label: "Open ticket",
					emoji: '🎟️'
				}
			]
		}]
	},
	confirm(id) {
		return [{
			type: 1,
			components: [
				{
					type: 2,
					style: 3,
					custom_id: `yes`,
					label: "Agree and Continue",
					emoji: '✅'
				},
				{
					type: 2,
					style: 4,
					custom_id: `no`,
					label: "Cancel Report",
					emoji: '❌'
				}
			]
		}]
	}
}

export class ReportHandler {
	menus = new Map();

	constructor(bot) {
		this.bot = bot;
		this.stores = bot.stores;

		this.bot.on('interactionCreate', (intr) => {
			if(intr.type !== IT.MessageComponent) return;
			if(intr.componentType !== CT.Button) return;
			this.handleButtons(intr);
		})
	}

	async report(ctx, data = {
		type,
		name,
		object_id
	}) {
		var cfg = await this.stores.configs.get(ctx.guild.id);
		if(!cfg?.reports)
			return "No report channel set. Please ask the mods to set one.";

		var conf;
		if(!data.object_id) {
			var agree = await ctx.reply({
				withResponse: true,
				flags: ['Ephemeral', 'IsComponentsV2'],
				components: [
					{
						type: 17,
						accent_color: 0xaa5555,
						components: [
							{
								type: 10,
								content: `# Report Submission Process`
							},
							{
								type: 10,
								content: (
									`## Before continuing...\n` +
									`You will need to have prepared:\n` +
									`- A name for the user(s)/server(s) you are reporting (this can be their username, a group name, or some other name)\n` +
									`- The Discord ID(s) of the user(s)/server(s) you are reporting (**We cannot act on reports without some kind of ID.**)\n` +
									`- The reason you are submitting the report\n` +
									`- Links to any evience you have to back up the report (eg. a Google Drive folder with the images or other direct media links)\n\n` +
									`**Without this information, your report will most likely be denied.** Repeated failure to give proper information with reports may ` +
									`result in being blacklisted from submitting reports or removal from the server altogether.`
								)
							},
							{
								type: 10,
								content: (
									`## Process\n` +
									`Once your report is submitted, moderators will review the evidence received and come to a conclusion.\n` +
									`If more is needed from you, a member of staff will reach out and discuss things with you.\n\n` +
									`**Reviewing reports may take some time.** As long as you are still in the server and ` +
									`have DMs enabled, you will be notified when a decision is reached.`
								)
							},
							{
								type: 10,
								content: (
									`## Agreement\n` +
									`Pressing the button below will acknowledge the above and show a modal for the submission. `+
									`Please press this once you have everything prepared.\n` +
									`If you'd like to cancel the report, simply hit the cancel button below or exit out of the modal ` +
									`once it pops up.`
								)
							}
						]
					},
					...BUTTONS.confirm()
				]
			});

			try {
				conf = await agree.resource.message.awaitMessageComponent({
					filter: (int) => int.user.id == ctx.user.id,
					time: 5 * 60 * 60 * 1000
				})
			} catch(e) {
				console.error(e);
			}

			await ctx.deleteReply();

			if(!conf?.customId) return "Error: Timed out!";
			if(conf.customId == 'no') return 'Action cancelled.';
		}
			

		var m = await this.bot.utils.awaitModal(
			data.object_id ? ctx : conf,
			MODALS.report(ctx, data),
			ctx.user,
			false,
			5 * 60_000
		)
		if(!m) return "No data given.";

		var md = await m.fetchReply();
		await md.delete();

		var mdata = {
			type: m.fields.getField('type').values[0],
			object_id: m.fields.getField('object-id').value.trim(),
			name: m.fields.getField('object-name').value.trim(),
			reason: m.fields.getField('reason').value.trim(),
			evidence: m.fields.getField('evidence').value.trim()
		}

		var sub = await this.stores.reports.create({
			host: ctx.guild.id,
			name: data.name,
			reporter: ctx.user.id,
			...mdata
		})

		var channel = await ctx.guild.channels.fetch(cfg.reports);

		var msg = await channel.send({
			flags: ['IsComponentsV2'],
			components: [
				...(await sub.genPost({ log: false, timestamp: new Date() })),
				...BUTTONS[mdata.type](sub.hid)
			]
		});

		var post = await this.stores.reportPosts.create({
			server_id: ctx.guild.id,
			channel_id: channel.id,
			message_id: msg.id,
			report: sub.hid
		})

		return {
			content: "Report received. Please wait while a moderator reviews it.",
			ephemeral: true
		};
	}

	async handleButtons(ctx) {
		var post = await this.stores.reportPosts.get(ctx.guild.id, ctx.message.id);
		if(!post?.id) return;
		await ctx.deferUpdate();
		var msg = ctx.message;

		var report = await this.stores.reports.get(ctx.guild.id, post.report);
		if(!report?.id) return await ctx.update({content: 'Report deleted, post no longer needed.', embeds: [], components: []});

		let config = await this.stores.configs.get(ctx.guild.id);
		
		let comps = msg.components.map(c => c.toJSON());
		comps.pop();
		var embed = comps[0];
		switch(ctx.customId) {
			case 'accept':
				try {
					var u2 = await this.bot.users.fetch(report.reporter);
				} catch(e) { }

				var reason;
				var m = await msg.channel.send({
					embeds: [{
						title: 'Click below to enter the ban reason.'
					}],
					components: [{
						type: 1,
						components: [
							{
								type: 2,
								label: 'Add reason',
								custom_id: 'reason',
								style: 1,
								emoji: '📝'							}
						]
					}]
				});

				var resp = await this.bot.utils.getChoice(this.bot, m, ctx.user, 2 * 60 * 1000, false);
				if(!resp.choice) return await ctx.followUp({content: 'Nothing selected, cancelling action.', flags: [MessageFlags.Ephemeral]});
				var mod = await this.bot.utils.awaitModal(resp.interaction, MODALS.reason(reason), ctx.user, true, 5 * 60_000);
				if(mod) reason = mod.fields.getTextInputValue('reason')?.trim();
				var md = await mod.followUp({ components: [{
					type: 17,
					accent_color: 0x55aaaa,
					components: [
						{
							type: 10,
							content: '## Reason'
						},
						{
							type: 10,
							content: reason ?? '(no reason received)'
						}
					]
				}], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]});
				
				await m.delete();

				let response;
				switch(report.type) {
					case 'user':
						response = await this.acceptUserReport(report, ctx, { reason, banlogsId: config.ban_logs, modlogsId: config.mod_logs });
						break;
					case 'listed':
						response = await this.acceptListedServerReport(report, ctx);
						break;
					case 'unlisted':
						response = await this.acceptUnlistedServerReport(report, ctx);
						break;
				}


				break;
			case 'deny':
				try {
					var u2 = await this.bot.users.fetch(report.reporter);
				} catch(e) { }

				var reason;
				var m = await msg.channel.send({
					embeds: [{
						title: 'Would you like to give a denial reason?'
					}],
					components: BTNS.DENY(false)
				});

				var resp = await this.bot.utils.getChoice(this.bot, m, ctx.user, 2 * 60_000, false);
				if(!resp.choice) return await ctx.followUp({content: 'Nothing selected.', flags: [MessageFlags.Ephemeral]});
				switch(resp.choice) {
					case 'cancel':
						await m.delete()
						return resp.interaction.reply({content: 'Action cancelled.', flags: [MessageFlags.Ephemeral]});
					case 'reason':
						var mod = await this.bot.utils.awaitModal(resp.interaction, MODALS.reason(reason), ctx.user, false, 5 * 60_000);
						if(mod) reason = mod.fields.getTextInputValue('reason')?.trim();
						var md = await mod.followUp("Modal received.");
						await md.delete()
						break;
					case 'skip':
						break;
				}

				await m.delete();

				embed.accent_color = 0xaa5555;
				comps[0] = embed;
				let footer = {
					type: 10,
					content: `-# Report denied | **Reason:** ${reason ?? "*(no reason given)*"}`
				}

				try {
					await msg.edit({
						components: [
							...comps,
							footer
						]
					});

					await post.delete();
					await report.delete();
				} catch(e) {
					console.log(e);
					return await msg.channel.send({
						content: `Error: Unable to complete report process.\nReason:\n\`\`\`\n${e.message}\`\`\``,
						flags: [MessageFlags.Ephemeral]
					});
				}

				try {
					await u2.send({
						components: [{
							type: 17,
							accent_color: 0xaa5555,
							components: [{
								type: 10,
								content: (
									`# Report Denied\n` +
									`**Server:** ${ctx.guild.name} (${ctx.guild.id})\n` +
									`**Report:** ${report.name} (${report.hid})\n\n` +
									`### Reason\n` +
									reason ?? "*(no reason given)*" +
									`\n\n-# Denied ${formatTime()}`
								)
							}]
						}],
						flags: [MessageFlags.IsComponentsV2]
					})
				} catch(e) {
					console.log(e);
					return await msg.channel.send({
						content: `Error: Unable to message the user who submitted the report.\nReason:\n\`\`\`\n${e.message}\`\`\``,
						flags: [MessageFlags.Ephemeral]
					});
				}

				return await ctx.followUp({content: 'Report denied.', flags: [MessageFlags.Ephemeral]});
				break;
		}
	}

	// TODO: add handling for report acceptance

	async acceptUserReport(report, ctx, data) {
		let { reason, banlogsId, modlogsId } = data;
		let msg = await ctx.followUp({ content: 'Please wait, verifying report IDs...', flags: [MessageFlags.Ephemeral] });
		let ids = report.object_id.split(/\s+/);
		console.log(ids);

		let verified = [];
		for(var id of ids) {
			try {
				let member = await this.bot.users.fetch(id);
				verified.push(member);
			} catch(e) { }
		}

		if(!verified.length) return await ctx.followUp({
			content: "No users were able to be verified. This likely means that the IDs supplied are incorrect.",
			flags: [MessageFlags.Ephemeral]
		})

		report.object_id = verified.map(x => x.id).join("\n");
		report.save();

		msg = await ctx.followUp({
			components: [
				{
					type: 17,
					components: [
						{
							type: 10,
							content: '## Confirmation\nPlease confirm the users to ban below.'
						},
						{
							type: 10,
							content: verified.map(x => `${x} (${x.username} / ${x.id})`).join("\n")
						}
					]
				},
				...BTNS.ACCEPT_USER()
			],
			flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
		});

		let resp = await this.bot.utils.getChoice(this.bot, msg, ctx.user, 2 * 60_000, false);
		if(!resp.choice) return await ctx.followUp({content: 'Nothing selected, cancelling action.', flags: [MessageFlags.Ephemeral]});
		switch(resp.choice) {
			case 'cancel':
				return resp.interaction.reply({content: 'Action cancelled.', flags: [MessageFlags.Ephemeral]});
			case 'edit':
				var mod = await this.bot.utils.awaitModal(resp.interaction, MODALS.editUsers(verified.map(x => x.id).join("\n")), ctx.user, false, 10 * 60_000);
				if(mod) ids = mod.fields.getTextInputValue('user-ids')?.trim().split(/\s+/);
				var md = await mod.followUp({ content: "Modal received.", flags: [MessageFlags.Ephemeral]});
				await md.delete()

				report.object_id = ids.join("\n");
				await report.save();
				return await this.acceptUserReport(report, ctx, reason);
				break;
			case 'confirm':
				return await this.bot.handlers.ban.ban(ctx, { reason, users: verified });
				break;
		}
	}

	async acceptListedServerReport() {

	}

	async acceptUnlistedServerReport() {

	}
}

export default (bot) => new ReportHandler(bot);
