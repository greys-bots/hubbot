const { Models: { SlashCommand } } = require('frame');
const { ApplicationCommandOptionType: ACOT, ChannelType: CT } = require('discord.js');

class Command extends SlashCommand {
    #bot;
    #stores;

    constructor(bot, stores) {
        super({
            name: 'repost',
            description: "Repost a server to another category",
            options: [
				{
					name: 'server',
					description: 'The server to repost',
					type: ACOT.String,
					required: true,
					autocomplete: true
				},
				{
					name: 'category',
					description: 'The new category',
					type: ACOT.String,
					required: true,
					autocomplete: true
				}
			],
            usage: [
                `[aerver] [category] - Repost a given server. Posts will update automatically`
            ],
            ephemeral: true
        })
        this.#bot = bot;
        this.#stores = stores;
    }

    async execute(ctx) {
    	var server = ctx.options.getString('server').trim();
    	var category = ctx.options.getString('category').trim();

    	var s = await this.#stores.submissions.get(ctx.guild.id, server);
    	var c = await this.#stores.categories.get(ctx.guild.id, category);
    	
        if(!s?.id) return "That server wasn't found.";
        if(!c?.id) return "That category wasn't found.";

        var posts = await s.getPosts();
        for(var p of posts) {
        	try {
        		var ch = await ctx.guild.channels.fetch(p.channel_id);
        		var msg = await ch.messages.fetch(p.message_id);
        		await msg.delete();
        	} catch(e) {
        		console.log(e)
        	}
        }

        s.category = c.hid;
        await s.save();
        await s.getTags();

        var chan = await ctx.guild.channels.fetch(c.channel);
        var m = await chan.send(s.genPost());
        await this.#stores.posts.create({
        	server_id: ctx.guild.id,
        	channel_id: m.channel.id,
        	message_id: m.id,
        	submission: s.hid
        })

        return "Server reposted.";
    }

    async auto(ctx) {
		var foc = ctx.options.getFocused(true);
		var val = foc.value;
		var res;
		switch(foc.name) {
			case 'server':
				var subs = await this.#stores.submissions.getAll(ctx.guild.id);
				if(!subs?.length) return [];

				if(val) {
					res = subs.filter(x => (
						x.name.toLowerCase().includes(val.toLowerCase()) ||
						x.description.toLowerCase().includes(val.toLowerCase())
					))
					if(!res.length) return [];
				} else res = subs;
				break;
			case 'category':
				var cats = await this.#stores.categories.getAll(ctx.guild.id);
				if(!cats?.length) return [];

				if(val) {
					res = cats.filter(x => (
						x.name.toLowerCase().includes(val.toLowerCase()) ||
						x.description.toLowerCase().includes(val.toLowerCase())
					))
					if(!res.length) return [];
				} else res = cats;
				break;
		}

		return res.map(x => ({
			name: x.name,
			value: x.hid
		}))
	}
}

module.exports = (bot, stores) => new Command(bot, stores);