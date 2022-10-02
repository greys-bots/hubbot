module.exports = {
	buttons: {
		SUB: (disabled) => ([{
			type: 1,
			components: [
				{
					type: 2,
					style: 3,
					label: 'Accept',
					custom_id: 'accept',
					emoji: '✅',
					disabled
				},
				{
					type: 2,
					style: 4,
					label: 'Deny',
					custom_id: 'deny',
					emoji: '❌',
					disabled
				},
				{
					type: 2,
					style: 2,
					label: 'Ticket',
					custom_id: 'ticket',
					emoji: '🎟️',
					disabled
				}
			]
		}])
	}
}