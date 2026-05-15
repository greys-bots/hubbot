import frame from 'frame';
const { Models: { DataStore, DataObject } } = frame;

const KEYS = {
	id: { },
	server_id: { },
	submission_channel: { patch: true },
	requests: { patch: true },
	autothread: { patch: true },
	multicategory: { patch: true },
	deny_logs: { patch: true },
	ban_logs: { patch: true },
	mod_logs: { patch: true },
	reports: { patch: true }
}

export class Config extends DataObject {	
	constructor(store, keys, data) {
		super(store, keys, data);
	}
}

export class ConfigStore extends DataStore {
	constructor(bot, db) {
		super(bot, db)
	}

	async init() {
		await this.db.query(`CREATE TABLE IF NOT EXISTS configs (
			id 					SERIAL PRIMARY KEY,
			server_id 			TEXT,
			submission_channel 	TEXT,
			requests 			TEXT,
			autothread			BOOLEAN,
			multicategory 		BOOLEAN,
			deny_logs 			TEXT,
			ban_logs 			TEXT,
			mod_logs 			TEXT,
			reports		 		TEXT
		)`)
	}

	async create(data = {}) {
		try {
			var c = await this.db.query(`INSERT INTO configs (
				server_id,
				submission_channel,
				requests,
				autothread,
				multicategory,
				deny_logs,
				ban_logs,
				mod_logs,
				reports
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
			RETURNING id`,
			[data.server_id, data.submission_channel, data.requests,
			 data.autothread, data.multicategory, data.deny_logs, data,ban_logs, data.mod_logs, data.reports]);
		} catch(e) {
			console.log(e);
	 		return Promise.reject(e.message);
		}
		
		return await this.getID(c.rows[0].id);
	}

	async get(server) {
		try {
			var data = await this.db.query(`SELECT * FROM configs WHERE server_id = $1`,[server]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			return new Config(this, KEYS, data.rows[0]);
		} else return new Config(this, KEYS, {server_id: server});
	}

	async getID(id) {
		try {
			var data = await this.db.query(`SELECT * FROM configs WHERE id = $1`,[id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			return new Config(this, KEYS, data.rows[0]);
		} else return new Config(this, KEYS, {});
	}

	async update(id, data = {}) {
		try {
			await this.db.query(`UPDATE configs SET ${Object.keys(data).map((k, i) => k+"=$"+(i+2)).join(",")} WHERE id = $1`,[id, ...Object.values(data)]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		return await this.getID(id);
	}

	async delete(id) {
		try {
			await this.db.query(`DELETE FROM configs WHERE id = $1`, [id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		return;
	}
}

export default (bot, db) => new ConfigStore(bot, db);