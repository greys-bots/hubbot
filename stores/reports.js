const { Models: { DataStore, DataObject } } = require('frame');

const KEYS = {
	id: { },
	hid: { },
	host: { },
	object_id: { },
	reporter: { },
	name: { },
	reason: { },
	type: {  }
}

class Report extends DataObject {	
	constructor(store, keys, data) {
		super(store, keys, data);
		this.resolved = {};
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
			type 				TEXT
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
				type
			) VALUES (find_unique('reports'), $1,$2,$3,$4,$5,$6)
			RETURNING id`,
			[data.host, data.object_id, data.reporter, data.name, data.reason,
			 data.type]);
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
				type
			) VALUES (find_unique('reports'), $1,$2,$3,$4,$5,$6)`,
			[data.host, data.object_id, data.reporter, data.name, data.reason,
			 data.type]);
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