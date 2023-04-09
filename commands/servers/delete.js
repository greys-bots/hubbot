const { Models: { SlashCommand } } = require('frame');
const { ApplicationCommandOptionType: ACOT, ChannelType: CT } = require('discord.js');
const { buttons: { DELETE } } = require('../../extras');


class Command extends SlashCommand {
    #bot;
    #stores;

    constructor(bot, stores) {
        super({
            name: 'delete',
            description: "Delete a server",
            options: [
				{
					name: 'server',
					description: 'The server to delete',
					type: ACOT.String,
					required: true,
					autocomplete: true
				}
			],
            usage: [
                `[aerver] - Delete a given server. Posts will delete automatically`
            ]
        })
        this.#bot = bot;
        this.#stores = stores;
    }

    async execute(ctx) {
    	var server = ctx.options.getString('server').trim();
    	var sub = await this.#stores.submissions.get(ctx.guild.id, server);
    	if(!sub?.id) return "Server not found.";

    	var posts = await sub.getPosts();

    	var m = await ctx.reply({
    		content: 'Are you sure you want to delete this server?',
    		components: DELETE,
    		fetchReply: true
    	})

    	var conf = await this.#bot.utils.getConfirmation(this.#bot, m, ctx.user);
    	if(conf.msg) return conf.msg;

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

    	if(errs.length) return "The server was deleted, but some posts could not be removed:\n" + errs.join('\n');
    	else return "Server deleted. All posts have automatically been removed.";
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

module.exports = (bot, stores) => new Command(bot, stores);