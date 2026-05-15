import frame from 'frame';
const { Models: { SlashCommand } } = frame;
import { ApplicationCommandOptionType as ACOT, ChannelType as CT } from 'discord.js';
import extras from '../../extras.js';
const { buttons: { DELETE } } = extras;


class Command extends SlashCommand {
    #bot;
    #stores;

    constructor(bot, stores) {
        super({
            name: 'delist',
            description: "Delist a server",
            options: [
				{
					name: 'server',
					description: 'The server to delist',
					type: ACOT.String,
					required: true,
					autocomplete: true
				},
				{
					name: 'reason',
					description: 'The reason to delist the server',
					type: ACOT.String
				}
			],
            usage: [
                `[server] - Delist a given server. Posts will delete automatically`
            ]
        })
        this.#bot = bot;
        this.#stores = stores;
    }

    async execute(ctx) {
    	var cfg = await this.#stores.configs.get(ctx.guild.id);
    	var server = ctx.options.getString('server').trim();
    	var sub = await this.#stores.submissions.get(ctx.guild.id, server);
    	var reason = ctx.options.getString('reason')?.trim();
    	if(!sub?.id) return "Server not found.";

    	var posts = await sub.getPosts();

    	var m = await ctx.reply({
    		content: 'Are you sure you want to delist this server?',
    		components: DELETE,
    		fetchReply: true
    	})

    	var conf = await this.#bot.utils.getConfirmation(this.#bot, m, ctx.user);
    	if(conf.msg) return conf.msg;

    	var dlog, mlog;
    	if(cfg.deny_logs) dlog = await ctx.guild.channels.fetch(cfg.deny_logs);
    	if(cfg.mod_logs) mlog = await ctx.guild.channels.fetch(cfg.mod_logs);

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
								content: '## Submission Delisted'
							},
							{
								type: 14
							},
							{
								type: 10,
								content:
									`### Responsible Moderator\n${ctx.user} (${ctx.user.id})\n` +
									`### Submission\n${sub.name} (\`${sub.hid}\`)\n` +
									`### Reason\n${reason ?? "(none given)"}`
									
							},
							{
								type: 14
							},
							{
								type: 10,
								content: `-# Date: ${this.bot.utils.formatTime()}` + (sub.server_id ? ` | Server ID: ${sub.server_id}` : '')
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
								content: '## Submission Delisted'
							},
							{
								type: 14
							},
							{
								type: 10,
								content:
									`### Submission\n${sub.name} (\`${sub.hid}\`)\n` +
									`### Reason\n${reason ?? "(none given)"}`
							}
						]
					},
					{
						type: 14
					},
					{
						type: 10,
						content: `-# Date: ${this.bot.utils.formatTime()}` + (sub.server_id ? ` | Server ID: ${sub.server_id}` : '')
					}
				]
			})
		}

    	await sub.delete();
    	var channels = {}; // cache channels in case of multiple posts in a channel
    	var errs = []
    	if(posts?.length) {
    		for(var p of posts) {
	    		try {
	    			var c = channels[p.channel_id];
		    		if(!c) {
		    			c = await ctx.guild.channels.fetch(p.channel_id);
		    			channels[c.id] = c;
		    		}

		    		var msg = await c.messages.fetch(p.message_id);
		    		await msg.delete();
		    		await p.delete()
	    		} catch(e) {
	    			errs.push(`https://www.discord.com/channels/${ctx.guild.id}/${p.channel_id}/${p.message_id} - ${e.message ?? e}`);
	    		}
	    	}
    	}

    	if(errs.length) return "The submission was delisted, but some posts could not be removed:\n" + errs.join('\n');
    	else return "Submission delisted. All posts have automatically been removed.";
    }

    async auto(ctx) {
		var foc = ctx.options.getFocused();

		var subs = await this.#stores.submissions.getAll(ctx.guild.id);
		if(!subs?.length) return [];

		if(foc) {
			subs = subs.filter(x => (
				x.name.toLowerCase().includes(foc.toLowerCase()) ||
				x.description.toLowerCase().includes(foc.toLowerCase())
			))
			if(!subs.length) return [];
		}

		return subs.map(s => ({
			name: s.name,
			value: s.hid
		}))
	}
}

export default (bot, stores) => new Command(bot, stores);