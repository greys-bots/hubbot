const { Models: { DataStore, DataObject } } = require('frame');

const KEYS = {
	id: { },
	hid: { },
	host: { },
	server_id: { },
	user_id: { },
	changes: { patch: true }
}

class EditRequest extends DataObject {	
	constructor(store, keys, data) {
		super(store, keys, data);
	}
}

class EditStore extends DataStore {
	constructor(bot, db) {
		super(bot, db)
	}

	async init() {
		await this.db.query(`CREATE TABLE IF NOT EXISTS edits (
			id 					SERIAL PRIMARY KEY,
			hid		 			TEXT,
			host 				TEXT,
			server_id		 	TEXT,
			user_id				TEXT,
			changes 			JSONB
		)`)
	}

	async create(data = {}) {
		try {
			var c = await this.db.query(`INSERT INTO edits (
				hid,
				host,
				server_id,
				user_id,
				changes
			) VALUES (find_unique('edits'), $1,$2,$3,$4)
			returning id`,
			[data.host, data.server_id, data.user_id, data.changes]);
		} catch(e) {
			console.log(e);
	 		return Promise.reject(e.message);
		}
		
		return await this.getID(c.rows[0].id);
	}

	async get(server, hid) {
		try {
			var data = await this.db.query(`SELECT * FROM edits WHERE host = $1 and hid = $2`,[server, hid]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			return new EditRequest(this, KEYS, data.rows[0]);
		} else return new EditRequest(this, KEYS, {host: server});
	}

	async getID(id) {
		try {
			var data = await this.db.query(`SELECT * FROM edits WHERE id = $1`,[id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			return new EditRequest(this, KEYS, data.rows[0]);
		} else return new EditRequest(this, KEYS, {});
	}

	async getAll(server) {
		try {
			var data = await this.db.query(`SELECT * FROM edits WHERE host = $1`,[server]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		if(data.rows?.[0]) {
			return data.rows.map(x => new EditRequest(this, KEYS, x));
		} else return undefined;
	}

	async getBySubmission(server, hid) {
		try {
			var data = await this.db.query(`SELECT * FROM edits WHERE host = $1 and server_id = $2`,[server, hid]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			return data.rows.map(x => new EditRequest(this, KEYS, x));
		} else return undefined;
	}

	async update(id, data = {}) {
		try {
			await this.db.query(`UPDATE edits SET ${Object.keys(data).map((k, i) => k+"=$"+(i+2)).join(",")} WHERE id = $1`,[id, ...Object.values(data)]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		return await this.getID(id);
	}

	async delete(id) {
		try {
			await this.db.query(`DELETE FROM edits WHERE id = $1`, [id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		return;
	}
}

module.exports = (bot, db) => new EditStore(bot, db);