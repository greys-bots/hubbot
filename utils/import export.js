module.exports = {
	getExportData: async (bot, server) => {
		return new Promise(async res => {
			var config 				= await bot.stores.configs.get(server);
			var servers 			= await bot.stores.servers.getAll(server);
			var posts 				= await bot.stores.posts.getAll(server);
			var reactionroles 		= await bot.stores.reactionRoles.getAll(server);
			var reactioncategories 	= await bot.stores.reactionCategories.getAll(server);
			var reactionposts 		= await bot.stores.reactionPosts.getAll(server);
			var starposts 			= await bot.stores.starPosts.getAll(server);
			var banlogs 			= await bot.stores.banLogs.getAll(server);
			var receipts 			= await bot.stores.receipts.getAll(server);
			var ticketconfig 		= await bot.stores.ticketConfigs.get(server);
			var ticketposts 		= await bot.stores.ticketPosts.getAll(server);
			var customcommands 		= await bot.stores.customCommands.getAll(server);

			res({
				config,
				servers,
				posts,
				reactionroles,
				reactioncategories,
				reactionposts,
				starposts,
				banlogs,
				receipts,
				ticketconfig,
				ticketposts,
				customcommands
			});
		})
	},
	deleteAllData: async (bot, server) => {
		return new Promise(async res => {
			try {
				await bot.stores.configs.delete(server);
				await bot.stores.servers.deleteAll(server);
				await bot.stores.posts.deleteAll(server);
				await bot.stores.reactionRoles.deleteAll(server);
				await bot.stores.reactionCategories.deleteAll(server);
				await bot.stores.reactionPosts.deleteAll(server);
				await bot.stores.starPosts.deleteAll(server);
				await bot.stores.banLogs.deleteAll(server);
				await bot.stores.receipts.deleteAll(server);
				await bot.stores.ticketConfigs.delete(server);
				await bot.stores.ticketPosts.deleteAll(server);
				await bot.stores.customCommands.deleteAll(server);
			} catch(e) {
				console.log(e);
				return res(false);
			}
			res(true)
		})
	},
	//WIP
	// importData: async (bot, server) => {

	// }
}