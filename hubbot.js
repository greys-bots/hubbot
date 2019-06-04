const Eris 		= require("eris-additions")(require("eris"));
const dblite 	= require("dblite");
const fs 		= require("fs");

require('dotenv').config();

const bot 	= new Eris(process.env.TOKEN, {restMode: true});

bot.db		= dblite('data.sqlite',"-header");

bot.utils = require('./utilities')

bot.prefix		= "hub!";

bot.commands	= {};

async function setup() {
	bot.db.query(`CREATE TABLE IF NOT EXISTS servers(
		id         	INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id   BIGINT,
        contact_id  TEXT,
        name        TEXT,
        description TEXT,
        invite		TEXT,
        pic_url     TEXT
	)`);

	bot.db.query(`CREATE TABLE IF NOT EXISTS posts (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id   BIGINT,
        channel_id  BIGINT,
        message_id  BIGINT
    )`);

    bot.db.query(`CREATE TABLE IF NOT EXISTS configs (
    	id 				INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id   	BIGINT,
        banlog_channel	BIGINT,
        reprole 		BIGINT
    )`);

	var files = fs.readdirSync("./commands");
	await Promise.all(files.map(f => {
		bot.commands[f.slice(0,-3)] = require("./commands/"+f);
		return new Promise((res,rej)=>{
			setTimeout(res("a"),100)
		})
	})).then(()=> console.log("finished loading commands."));
}

bot.parseCommand = async function(bot, msg, args, command) {
	return new Promise(async (res,rej)=>{
		var commands;
		var cmd;
		var name = "";
		if(command) {
			commands = command.subcommands || [];
		} else {
			commands = bot.commands;
		}

		if(args[0] && commands[args[0].toLowerCase()]) {
			cmd = commands[args[0].toLowerCase()];
			name = args[0].toLowerCase();
			args = args.slice(1);
		} else if(args[0] && Object.values(commands).find(cm => cm.alias && cm.alias.includes(args[0].toLowerCase()))) {
			cmd = Object.values(commands).find(cm => cm.alias && cm.alias.includes(args[0].toLowerCase()));
			name = args[0].toLowerCase();
			args = args.slice(1);
		} else if(!cmd) {
			res(undefined);
		}

		if(cmd && cmd.subcommands && args[0]) {
			let data = await bot.parseCommand(bot, msg, args, cmd);
			if(data) {
				cmd = data[0]; args = data[1];
				name += " "+data[2];
			}
		}

		res([cmd, args, name]);
	})
	
}

bot.commands.help = {
	help: ()=> "Displays help embed.",
	usage: ()=> [" - Displays help for all commands.",
				" [command] - Displays help for specfic command."],
	execute: async (bot, msg, args) => {
		let cmd;
		let names;
		let embed;
		if(args[0]) {
			let dat = await bot.parseCommand(bot, msg, args);
			if(dat) {
				cmd = dat[0];
				names = dat[2].split(" ");
				embed = {
					title: `Help | ${names.join(" - ").toLowerCase()}`,
					description: [
						`${cmd.help()}\n\n`,
						`**Usage**\n${cmd.usage().map(c => `**${bot.prefix + names.join(" ")}**${c}`).join("\n")}\n\n`,
						`**Aliases:** ${cmd.alias ? cmd.alias.join(", ") : "(none)"}\n\n`,
						`**Subcommands**\n${cmd.subcommands ?
							Object.keys(cmd.subcommands).map(sc => `**${bot.prefix}${sc}** - ${cmd.subcommands[sc].help()}`).join("\n") : 
							"(none)"}`
					].join(""),
					footer: {
						icon_url: bot.user.avatarURL,
						text: "Arguments like [this] are required, arguments like <this> are optional."
					}
				}
			} else {
				msg.channel.createMessage("Command not found.")
			}
		} else {
			embed = {
				title: `HubBot - help`,
				description:
					`**Commands**\n${Object.keys(bot.commands)
									.map(c => `**${bot.prefix + c}** - ${bot.commands[c].help()}`)
									.join("\n")}\n\n`,
				footer: {
					icon_url: bot.user.avatarURL,
					text: "Arguments like [this] are required, arguments like <this> are optional."
				}
			}
		}

		msg.channel.createMessage({embed: embed});
	},
	alias: ["h"]
}

bot.on("ready",()=>{
	console.log("Ready");
})

bot.on("messageCreate",async (msg)=>{
	if(msg.author.bot) return;
	if(!msg.content.startsWith(bot.prefix)) return;
	if(!msg.member.permission.has('manageMessages')) return msg.channel.createMessage('You do not have permission to do this.');
	let args = msg.content.replace(bot.prefix, "").split(" ");
	let cmd = await bot.parseCommand(bot, msg, args);
	if(cmd) cmd[0].execute(bot, msg, cmd[1]);
	else msg.channel.createMessage("Command not found.");
});

bot.on("messageReactionAdd",async (msg, emoji, user)=>{
	if(bot.user.id == user) return;
	if(!bot.pages) return;
	if(!bot.pages[msg.id]) return;
	if(!(bot.pages[msg.id].user == user)) return
	if(emoji.name == "\u2b05") {
		if(bot.pages[msg.id].index == 0) {
			bot.pages[msg.id].index = bot.pages[msg.id].data.length-1;
		} else {
			bot.pages[msg.id].index -= 1;
		}
		bot.editMessage(msg.channel.id, msg.id, bot.pages[msg.id].data[bot.pages[msg.id].index]);
	} else if(emoji.name == "\u27a1") {
		if(bot.pages[msg.id].index == bot.pages[msg.id].data.length-1) {
			bot.pages[msg.id].index = 0;
		} else {
			bot.pages[msg.id].index += 1;
		}
		bot.editMessage(msg.channel.id, msg.id, bot.pages[msg.id].data[bot.pages[msg.id].index]);
	} else if(emoji.name == "\u23f9") {
		bot.deleteMessage(msg.channel.id, msg.id);
		delete bot.pages[msg.id];
	}
});

setup();
bot.connect();
