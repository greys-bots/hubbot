const { Models: { DataStore, DataObject } } = require('frame');

const KEYS = {
	id: { },
	server_id: { },
	hid: { },
	name: { patch: true },
	description: { patch: true },
	channel: { patch: true }
}

class Category extends DataObject {	
	constructor(store, keys, data) {
		super(store, keys, data);
	}

	async getStats() {
		var res = await this.store.db.query(`
			select count(*) as count
			from submissions where
			host = $1 and
			category = $2
		`, [this.server_id, this.hid]);

		console.log(res.rows);
		return res.rows[0];
	}
}

class CategoryStore extends DataStore {
	constructor(bot, db) {
		super(bot, db)
	}

	async init() {
		await this.db.query(`CREATE TABLE IF NOT EXISTS categories (
			id 					SERIAL PRIMARY KEY,
			server_id 			TEXT,
			hid				 	TEXT,
			name				TEXT,
			description			TEXT,
			channel				TEXT
		)`)
	}

	async create(data = {}) {
		try {
			var c = await this.db.query(`INSERT INTO categories (
				server_id,
				hid,
				name,
				description,
				channel
			) VALUES ($1,find_unique('categories'),$2,$3,$4)
			RETURNING id`,
			[data.server_id, data.name,
			 data.description, data.channel]);
		} catch(e) {
			console.log(e);
	 		return Promise.reject(e.message);
		}
		
		return await this.getID(c.rows[0].id);
	}

	async index(data = {}) {
		try {
			await this.db.query(`INSERT INTO categories (
				server_id,
				hid,
				name,
				description,
				channel
			) VALUES ($1,find_unique('categories'),$2,$3,$4)
			RETURNING id`,
			[data.server_id, data.name,
			 data.description, data.channel]);
		} catch(e) {
			console.log(e);
	 		return Promise.reject(e.message);
		}
		
		return;
	}

	async get(server, hid) {
		try {
			var data = await this.db.query(`SELECT * FROM categories WHERE server_id = $1 AND hid = $2`,[server, hid]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			return new Category(this, KEYS, data.rows[0]);
		} else return new Category(this, KEYS, {server_id: server});
	}

	async getByChannel(server, channel) {
		try {
			var data = await this.db.query(`SELECT * FROM categories WHERE server_id = $1 AND channel = $2`,[server, channel]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			return new Category(this, KEYS, data.rows[0]);
		} else return new Category(this, KEYS, {server_id: server});
	}

	async checkExisting(server, name) {
		try {
			var data = await this.db.query(`SELECT * FROM categories WHERE server_id = $1 AND lower(name) = $2`,[server, name]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			return new Category(this, KEYS, data.rows[0]);
		} else return undefined;
	}

	async getAll(server) {
		try {
			var data = await this.db.query(`SELECT * FROM categories WHERE server_id = $1`,[server]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			return data.rows.map(x => new Category(this, KEYS, x));
		} else return undefined;
	}

	async getID(id) {
		try {
			var data = await this.db.query(`SELECT * FROM categories WHERE id = $1`,[id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			return new Category(this, KEYS, data.rows[0]);
		} else return new Category(this, KEYS, {});
	}

	async update(id, data = {}) {
		try {
			await this.db.query(`UPDATE categories SET ${Object.keys(data).map((k, i) => k+"=$"+(i+2)).join(",")} WHERE id = $1`,[id, ...Object.values(data)]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		return await this.getID(id);
	}

	async delete(id) {
		try {
			await this.db.query(`DELETE FROM categories WHERE id = $1`, [id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		return;
	}

	async deleteAll(id) {
		try {
			await this.db.query(`DELETE FROM categories WHERE server_id = $1`, [id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		return;
	}
}

module.exports = (bot, db) => new CategoryStore(bot, db);