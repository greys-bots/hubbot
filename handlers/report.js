const {
	ComponentType: CT,
	TextInputStyle: TIS,
	InteractionType: IT
} = require('discord.js');

const { buttons: BTNS } = require('../extras')

const MODALS = {
	user(ctx) {
		return {
			title: "Report a User",
			custom_id: `${ctx.guild.id}-${ctx.user.id}`,
			components: [
				{
					type: CT.ActionRow,
					components: [{
						type: CT.TextInput,
						custom_id: 'reason',
						label: 'Report Reason',
						style: TIS.Paragraph,
						min_length: 1,
						max_length: 2000,
						required: true
					}]
				}
			]
		}
	},
	server(ctx) {
		return {
			title: "Report a Server",
			custom_id: `${ctx.guild.id}-${ctx.user.id}`,
			components: [
				{
					type: CT.ActionRow,
					components: [{
						type: CT.TextInput,
						custom_id: 'reason',
						label: 'Report Reason',
						style: TIS.Paragraph,
						min_length: 1,
						max_length: 2000,
						required: true
					}]
				}
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
	})
}

const POSTS = {
	report: (data) => {
		var type;
		switch(data.type) {
			case 'user':
				type = 'User';
				break;
			case 'listed-server':
				type = 'Listed Server';
				break;
			case 'unlisted-server':
				type = 'Unlisted Server'
				break;
		}

		return {
			title: type + " Report",
			fields: [
				{
					name: 'Name',
					value: data.name
				},
				{
					name: 'ID',
					value: data.object_id
				},
				{
					name: "Reason",
					value: data.reason
				}
			],
			footer: {
				text: `Report ID: ${data.hid}`
			},
			author: {
				name: data.user.tag,
				icon_url: data.user.avatarURL()
			}
		}
	}
}

const BUTTONS = {
	"listed-server": (id) => {
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
	"unlisted-server": (id) => {
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
		if(!cfg?.report_channel)
			return "No report channel set. Please ask the mods to set one.";

		var mod;
		switch(data.type) {
			case 'user':
				mod = MODALS.user;
				break;
			case 'listed-server':
			case 'unlisted-server':
				mod = MODALS.server;
				break;
		}
		var m = await this.bot.utils.awaitModal(
			ctx,
			mod(ctx),
			ctx.user,
			false,
			5 * 60_000
		)
		if(!m) return "No data given.";

		var md = await m.fetchReply();
		await md.delete();

		var sub = await this.stores.reports.create({
			host: ctx.guild.id,
			object_id: data.object_id,
			name: data.name,
			reporter: ctx.user.id,
			reason: m.fields.getField('reason').value.trim(),
			type: data.type
		})

		var channel = await ctx.guild.channels.fetch(cfg.report_channel);

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