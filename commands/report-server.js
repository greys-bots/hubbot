const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
    #bot;
    #stores;

    constructor(bot, stores) {
        super({
            name: 'Report Server',
            description: "Report a server",
            type: 3,
            usage: [
                'Right click a server post -> `Report Server`'
            ],
            ephemeral: true
        })
        this.#bot = bot;
        this.#stores = stores;
    }

    async execute(ctx) {
        var post = await this.#stores.posts.get(ctx.guild.id, ctx.targetMessage.id);
		if(!post?.id) return "That isn't a server post.";
        var sub = await this.#stores.submissions.get(ctx.guild.id, post.submission);

		var res = await this.#bot.handlers.report.report(ctx, {
            type: "listed",
            name: sub.name,
            object_id: sub.server_id,
            guild: ctx.guild,
            user: ctx.user
        });
        if(res) return res;
    }
}

module.exports = (bot, stores) => new Command(bot, stores);