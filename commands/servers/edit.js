const { Models: { SlashCommand } } = require('frame');
const { ApplicationCommandOptionType: ACOT, ChannelType: CT } = require('discord.js');

class Command extends SlashCommand {
    #bot;
    #stores;

    constructor(bot, stores) {
        super({
            name: 'edit',
            description: "Edit a server",
            options: [
				{
					name: 'server',
					description: 'The server to edit',
					type: ACOT.String,
					required: true,
					autocomplete: true
				}
			],
            usage: [
                `[aerver] - Edit a given server. Posts will update automatically`
            ],
            ephemeral: true
        })
        this.#bot = bot;
        this.#stores = stores;
    }

    async execute(ctx) {
    	var server = ctx.options.getString('server').trim();
        var res = await this.#bot.handlers.server.handleEdit(server, ctx);
        if(res) return res;
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