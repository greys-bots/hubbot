module.exports = {
	async awaitSelection(ctx, choices, msg, options = {min_values: 1, max_values: 1, placeholder: '- - -'}, ephemeral) {
		var components = [{
			type: 3,
			custom_id: 'selector',
			options: choices,
			...options
		}]

		var reply;
		if(ctx.replied || ctx.deferred) {
			reply = await ctx.followUp({
				content: msg,
				components: [{
					type: 1,
					components
				}],
				ephemeral
			});
		} else {
			reply = await ctx.reply({
				content: msg,
				components: [{
					type: 1,
					components
				}],
				fetchReply: true,
				ephemeral
			});
		}

		try {
			var resp = await reply.awaitMessageComponent({
				filter: (intr) => intr.user.id == ctx.user.id && intr.customId == 'selector',
				time: 60000
			});
		} catch(e) { }
		if(!resp) return 'Nothing selected!';
		await resp.update({
			components: [{
				type: 1,
				components: components.map(c => ({
					...c,
					disabled: true,
					options: choices.map(ch => ({...ch, default: resp.values.includes(ch.value)}))
				}))
			}]
		});

		return {
			values: resp.values,
			message: reply,
			inter: resp
		};
	},
	
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