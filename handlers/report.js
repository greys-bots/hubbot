const {
	ComponentType: CT,
	TextInputStyle: TIS,
	InteractionType: IT
} = require('discord.js');

const { buttons: BTNS } = require('../extras')

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
					label: "User/Server Name",
					description: "Please share the name of who/what you're reporting.",
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
					label: "User/Server ID",
					description: "Please share the ID of who/what you're reporting.\nNOTE: We can't act on reports without an ID.",
					component: {
						type: CT.TextInput,
						custom_id: 'object-id',
						style: TIS.Short,
						min_length: 1,
						max_length: 100,
						required: true,
						value: data.object_id ?? null,
						placeholder: 'Value should look like this: 12345678987654321'
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
	deny: (value) => ({
		title: "Deny reason",
		custom_id: 'deny_reason',
		components: [{
			type: CT.Label,
			label: "Deny Reason",
			description: "Enter the deny reason below",
			component: {
				type: 4,
				custom_id: 'reason',
				style: 2,
				min_length: 1,
				max_length: 1024,
				required: true,
				placeholder: "Big meanie :(",
				value
			}
		}]
	})
}

const POSTS = {
	report: (data) => {
		var type;
		switch(data.type) {
			case 'user':
				type = 'User';
				break;
			case 'listed':
				type = 'Listed Server';
				break;
			case 'unlisted':
				type = 'Unlisted Server'
				break;
		}

		return {
			type: 17,
			components: [
				{
					type: 10,
					content: `# ${type} Report`,
				},
				{
					type: 10,
					content: `## Name\n${data.name}`
				},
				{
					type: 10,
					content: `## User/Server ID\n${data.object_id}`
				},
				{
					type: 10,
					content: `## Reason\n${data.reason}`
				},
				{
					type: 10,
					content: `## Evidence\n${data.evidence}`
				},
				{
					type: 14
				},
				{
					type: 10,
					content: `-# Report ID: ${data.hid}\n` +
					`-# Submitted by ${data.user} (${data.user.id})`
				}
			]
		}
	}
}

const BUTTONS = {
	"listed": (id) => {
		return [{
			type: 1,
			components: [
				{
					type: 2,
					style: 3,
					custom_id: `0accept`,
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
	"unlisted": (id) => {
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
					label: "Ban user",
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
	}
}

class ReportHandler {
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

		var m = await this.bot.utils.awaitModal(
			ctx,
			MODALS.report(ctx, data),
			ctx.user,
			false,
			5 * 60_000
		)
		if(!m) return "No data given.";

		var md = await m.fetchReply();
		await md.delete();

		console.log(m.fields/*.get('type').values*/);
		return {
			content: "Report received. Please wait while a moderator reviews it.",
			ephemeral: true
		};

		var mdata = {
			type: m.fields.get('type').values[0],
			object_id: m.fields.get('object_id').value.trim(),
		}

		var sub = await this.stores.reports.create({
			host: ctx.guild.id,
			name: data.name,
			reporter: ctx.user.id,
			reason: m.fields.getField('reason').value.trim(),
			type: data.type
		})

		var channel = await ctx.guild.channels.fetch(cfg.reports);

		var msg = await channel.send({
			...this.genPost({
				...sub,
				user: ctx.user,
				timestamp: new Date()
			}, "report"),
			components: BUTTONS[data.type](sub.hid)
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

	genPost(data, type) {
		return {embeds: [POSTS[type](data)]};
	}

	async handleButtons(ctx) {
		var post = await this.stores.reportPosts.get(ctx.guild.id, ctx.message.id);
		if(!post?.id) return;
		await ctx.deferUpdate();
		var msg = ctx.message;

		var report = await this.stores.reports.get(ctx.guild.id, post.report);
		if(!report?.id) return await ctx.update({content: 'Report deleted, post no longer needed.', embeds: [], components: []});
		
		var embed = msg.embeds[0].toJSON()
		switch(ctx.customId) {
			case 'accept':
				return await ctx.followUp('Button acknowledged')
				break;
			case 'deny':
				try {
					var u2 = await this.bot.users.fetch(report.user_id);
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
						var mod = await this.bot.utils.awaitModal(resp.interaction, MODALS.deny(reason), ctx.user, false, 5 * 60_000);
						if(mod) reason = mod.fields.getTextInputValue('reason')?.trim();
						var md = await mod.followUp("Modal received.");
						await md.delete()
						break;
					case 'skip':
						break;
				}

				await m.delete()

				embed.color = 0xaa5555;
				embed.footer.text += ' | Report denied.';
				embed.description += `\n\n**Denial reason:** ${reason ?? "*(no reason given)*"}`;

				try {
					await msg.edit({
						embeds: [embed],
						components: []
					});

					await u2.send({embeds: [{
						title: 'Report denied.',
						description: [
							`Server: ${ctx.guild.name} (${ctx.guild.id})`,
							`Report: ${submission.name}`
						].join("\n"),
						fields: [{name: 'Reason', value: reason ?? "*(no reason given)*"}],
						color: 0xaa5555,
						timestamp: new Date().toISOString()
					}]})

					await post.delete();
					await submission.delete();
				} catch(e) {
					console.log(e);
					return await msg.channel.send('Error: Report denied, but I couldn\'t message the user.');
				}

				return await ctx.followUp({content: 'Report denied.', ephemeral: true});
				break;
		}
	}

	async acceptUserReport(report) {
		
	}

	async acceptListedServerReport() {

	}

	async acceptUnlistedServerReport() {

	}
}

module.exports = (bot) => new ReportHandler(bot);
