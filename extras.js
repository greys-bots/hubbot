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
				}
			]
		}]),
		DENY: (disabled) => ([{
			type: 1,
			components: [
				{
					type: 2,
					label: 'Add reason',
					custom_id: 'reason',
					style: 1,
					emoji: '📝',
					disabled
				},
				{
					type: 2,
					label: 'Skip reason',
					custom_id: 'skip',
					style: 2,
					emoji: '➡️',
					disabled
				},
				{
					type: 2,
					label: 'Cancel',
					custom_id: 'cancel',
					style: 4,
					emoji: '❌',
					disabled
				},
			]
		}]),
		DELETE: [{
			type: 1,
			components: [
				{
					type: 2,
					label: 'Delete',
					custom_id: 'yes',
					style: 4,
					emoji: '🗑️'
				},
				{
					type: 2,
					label: 'Cancel',
					custom_id: 'cancel',
					style: 1,
					emoji: '❌'
				}
			]
		}]
	},
}