import 'dotenv/config';

import {
	GatewayIntentBits as Intents,
	Partials,
	Options
} from "discord.js";
import {
	FrameClient,
	Utilities,
	Handlers
} from 'frame';
import fs from "fs";

const __dirname = import.meta.dirname;

const bot = new FrameClient({
	intents: [
		Intents.Guilds,
		Intents.GuildMessages,
		Intents.GuildMessageReactions,
		// Intents.GuildMembers,
		Intents.DirectMessages,
		Intents.DirectMessageReactions
	],
	partials: [
		Partials.Message,
		Partials.User,
		Partials.Channel,
		Partials.GuildMember,
		Partials.Reaction
	],
	makeCache: Options.cacheWithLimits({
		MessageManager: 0,
		ThreadManager: 0
	})
}, {
	invite: process.env.INVITE,
	statuses: [
		(bot) => `/help | in ${bot.guilds.cache.size} guilds!`,
		(bot) => `/help | serving ${bot.users.cache.size} users!`
	]
});

async function setup() {
	var { db, stores } = await Handlers.DatabaseHandler(bot, __dirname + '/stores');
	bot.db = db;
	bot.stores = stores;
	let files;

	bot.handlers = {};
	bot.handlers.interaction = Handlers.InteractionHandler(bot, __dirname + '/commands');
	
	files = fs.readdirSync("./handlers");
	console.log(files);
	for(var f of files) {
		var n = f.slice(0, -3);
		bot.handlers[n] = (await import("./handlers/"+f)).default(bot)
	}

	bot.utils = Utilities;
	bot.utils = Object.assign(bot.utils, await import('./utils.js'));
}

bot.on("ready", async () => {
	console.log(`Logged in as ${bot.user.tag} (${bot.user.id})`);
})

bot.on('error', (err) => {
	console.log(`Error:\n${err.stack}`);
})

process.on("unhandledRejection", (e) => console.log(e));

setup()
.then(async () => {
	try {
		await bot.login(process.env.TOKEN);
	} catch(e) {
		console.log("Trouble connecting...\n"+e)
	}
})
.catch(e => console.log(e))