const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
    #bot;
    #stores;

    constructor(bot, stores) {
        super({
            name: 'report',
            description: "Report a server",
            type: 3,
            usage: [
                'Right click a server post -> `report`'
            ],
            ephemeral: true
        })
        this.#bot = bot;
        this.#stores = stores;
    }

    async execute(ctx) {
        var post = await this.#stores.posts.get(ctx.guild.id, ctx.targetMessage.id);
		if(!post?.id) return "That isn't a server post.";

		var res = await this.#bot.handlers.server.handleReport(post.submission, ctx);
        if(res) return res;
    }
}

module.exports = (bot, stores) => new Command(bot, stores);