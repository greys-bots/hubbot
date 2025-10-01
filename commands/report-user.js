const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
    #bot;
    #stores;

    constructor(bot, stores) {
        super({
            name: 'Report User',
            description: "Report a user",
            type: 3,
            usage: [
                "Right click a user's post -> `Report User`"
            ],
            ephemeral: true
        })
        this.#bot = bot;
        this.#stores = stores;
    }

    async execute(ctx) {
        var user = ctx.message.user;

		var res = await this.#bot.handlers.report.report(ctx, {
            type: "user",
            name: user.username,
            object_id: user.id,
            guild: ctx.guild,
            user: ctx.user
        });
        if(res) return res;
    }
}

module.exports = (bot, stores) => new Command(bot, stores);