const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
    #bot;
    #stores;

    constructor(bot, stores) {
        super({
            name: 'edit',
            description: "Edit a post",
            type: 3,
            usage: [
                'Right click a message -> `edit`'
            ],
            ephemeral: true
        })
        this.#bot = bot;
        this.#stores = stores;
    }

    async execute(ctx) {
        var post = await this.#stores.posts.get(ctx.guild.id, ctx.targetMessage.id);
		if(!post?.id) return "That isn't a server post.";

		var res = await this.#bot.handlers.server.handleEdit(post.submission, ctx);
        if(res) return res;
    }
}

module.exports = (bot, stores) => new Command(bot, stores);