import frame from 'frame';
const { Models: { DataStore, DataObject } } = frame;

const KEYS = {
	id: { },
	hid: { },
	host: { },
	user_ids: { },
	reason: { patch: true },
}

export class Ban extends DataObject {	
	constructor(store, keys, data) {
		super(store, keys, data);
		this.resolved = {};
	}
}

export class BanStore extends DataStore {
	constructor(bot, db) {
		super(bot, db)
	}

	async init() {
		await this.db.query(`CREATE TABLE IF NOT EXISTS bans (
			id 					SERIAL PRIMARY KEY,
			hid		 			TEXT,
			host 				TEXT,
			user_ids		TEXT,
			reason		 	TEXT
		)`)
	}

	async create(data = {}) {
		try {
			var c = await this.db.query(`INSERT INTO bans (
				hid,
				host,
				user_ids,
				reason
			) VALUES (find_unique('bans'), $1,$2,$3)
			RETURNING id`,
			[data.host, data.user_ids, data.reason]);
		} catch(e) {
			console.log(e);
	 		return Promise.reject(e.message);
		}
		
		return await this.getID(c.rows[0].id);
	}

	async get(server, hid) {
		try {
			var data = await this.db.query(`SELECT * FROM bans WHERE host = $1 and hid = $2`,[server, hid]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			return new Ban(this, KEYS, data.rows[0]);
		} else return new Ban(this, KEYS, {host: server});
	}

	async getID(id) {
		try {
			var data = await this.db.query(`SELECT * FROM bans WHERE id = $1`,[id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			return new Ban(this, KEYS, data.rows[0]);
		} else return new Ban(this, KEYS, {});
	}

	async getAll(server) {
		try {
			var data = await this.db.query(`SELECT * FROM bans WHERE host = $1`,[server]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		if(data.rows?.[0]) {
			return data.rows.map(x => new Ban(this, KEYS, x));
		} else return undefined;
	}

	async update(id, data = {}) {
		try {
			await this.db.query(`UPDATE bans SET ${Object.keys(data).map((k, i) => k+"=$"+(i+2)).join(",")} WHERE id = $1`,[id, ...Object.values(data)]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		return await this.getID(id);
	}

	async delete(id) {
		try {
			await this.db.query(`DELETE FROM bans WHERE id = $1`, [id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		return;
	}
}

export default (bot, db) => new BanStore(bot, db);