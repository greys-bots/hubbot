const { Models: { DataStore, DataObject } } = require('frame');

const KEYS = {
	id: { },
	hid: { },
	host: { },
	object_id: { },
	reporter: { },
	name: { },
	reason: { patch: true },
	evidence: { patch: true },
	type: {  },
	status: { patch: true }
}

class Report extends DataObject {	
	constructor(store, keys, data) {
		super(store, keys, data);
		this.resolved = {};
	}

	async genPost(data = { log: false, timestamp: new Date() } ) {
		var type;
		switch(this.type) {
			case 'user':
				type = 'User ' + (data?.log ? `Ban Log` : `Report`);
				break;
			case 'listed':
				type = 'Server ' + (data?.log ? `Delist Log` : `Report (listed)`);
				break;
			case 'unlisted':
				type = 'Server ' + (data?.log ? `Blacklist Log` : `Report (unlisted)`);
				break;
		}

		var color;
		if(data?.log) color = 0xaa5555;
		else {
			switch(this.status) {
				case 'pending':
					color = 0xccaa55;
					break;
				case 'accepted':
					color = 0x55aa55;
					break;
				case 'denied':
					color = 0xaa5555;
					break;
			}
		}

		var post = [
			{
				type: 17,
				accent_color: color,
				components: [
					{
						type: 10,
						content: `# ${type}`,
					},
					{
						type: 10,
						content: `## Name\n${this.name}`
					},
					{
						type: 10,
						content: `## User/Server ID\n${this.object_id}`
					},
					{
						type: 10,
						content: `## Reason\n${this.reason}`
					},
					{
						type: 10,
						content: `## Evidence\n${this.evidence}`
					}
				]
			},
			{
				type: 10,
				content: `-# Report ID: ${this.hid}`
			}
		];

		if(!data?.log) {
			post.push({
				type: 10,
				content: `-# Submitted by <@${this.reporter}> (${this.reporter})`
			})
		}

		if(data?.timestamp) {
			post.push({
				type: 10,
				content: `-# Received ${this.store.bot.utils.formatTime(data.timestamp, 'F')}`
			})
		}

		return post;
	}
}

class ReportStore extends DataStore {
	constructor(bot, db) {
		super(bot, db)
	}

	async init() {
		await this.db.query(`CREATE TABLE IF NOT EXISTS reports (
			id 					SERIAL PRIMARY KEY,
			hid		 			TEXT,
			host 				TEXT,
			object_id		 	TEXT,
			reporter			TEXT,
			name 				TEXT,
			reason		 		TEXT,
			evidence			TEXT,
			type 				TEXT,
			status 				TEXT
		)`)
	}

	async create(data = {}) {
		try {
			var c = await this.db.query(`INSERT INTO reports (
				hid,
				host,
				object_id,
				reporter,
				name,
				reason,
				evidence,
				type,
				status
			) VALUES (find_unique('reports'), $1,$2,$3,$4,$5,$6,$7,$8)
			RETURNING id`,
			[data.host, data.object_id, data.reporter, data.name, data.reason, data.evidence,
			 data.type, data.status ?? 'pending']);
		} catch(e) {
			console.log(e);
	 		return Promise.reject(e.message);
		}
		
		return await this.getID(c.rows[0].id);
	}

	async index(data = {}) {
		try {
			await this.db.query(`INSERT INTO reports (
				hid,
				host,
				object_id,
				reporter,
				name,
				reason,
				type,
				status
			) VALUES (find_unique('reports'), $1,$2,$3,$4,$5,$6,$7)`,
			[data.host, data.object_id, data.reporter, data.name, data.reason,
			 data.type, data.status ?? 'pending']);
		} catch(e) {
			console.log(e);
	 		return Promise.reject(e.message);
		}
		
		return;
	}

	async get(server, hid) {
		try {
			var data = await this.db.query(`SELECT * FROM reports WHERE host = $1 and hid = $2`,[server, hid]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			return new Report(this, KEYS, data.rows[0]);
		} else return new Report(this, KEYS, {host: server});
	}

	async getID(id) {
		try {
			var data = await this.db.query(`SELECT * FROM reports WHERE id = $1`,[id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			return new Report(this, KEYS, data.rows[0]);
		} else return new Report(this, KEYS, {});
	}

	async getAll(server) {
		try {
			var data = await this.db.query(`SELECT * FROM reports WHERE host = $1`,[server]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		if(data.rows?.[0]) {
			return data.rows.map(x => new Report(this, KEYS, x));
		} else return undefined;
	}

	async update(id, data = {}) {
		try {
			await this.db.query(`UPDATE reports SET ${Object.keys(data).map((k, i) => k+"=$"+(i+2)).join(",")} WHERE id = $1`,[id, ...Object.values(data)]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		return await this.getID(id);
	}

	async delete(id) {
		try {
			await this.db.query(`DELETE FROM reports WHERE id = $1`, [id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		return;
	}
}

module.exports = (bot, db) => new ReportStore(bot, db);