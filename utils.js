module.exports = {
	getChoice: async (bot, msg, user, time, update = true) => {
		return new Promise(res => {
			function intListener(intr) {
				if(!intr.isButton()) return;
				if(intr.channelId !== msg.channel.id ||
				   intr.user.id !== user.id) return;

				clearTimeout(timeout);
				bot.removeListener('interactionCreate', intListener);

				if(update) {
					intr.update({
						components: [{
							type: 1,
							components: intr.message.components[0].components.map(({data: b}) => ({
								...b,
								disabled: true
							}))
						}]
					})
				} else {
					intr.message.edit({
						components: [{
							type: 1,
							components: intr.message.components[0].components.map(({data: b}) => ({
								...b,
								disabled: true
							}))
						}]	
					})
				}
				
				return res({choice: intr.customId, interaction: intr});
			}

			const timeout = setTimeout(async () => {
				bot.removeListener('interactionCreate', intListener)
				res({choice: undefined, msg: 'ERR! Timed out!'})
			}, time ?? 30_000);

			bot.on('interactionCreate', intListener)
		})
	},
}