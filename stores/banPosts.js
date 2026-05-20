import frame from 'frame';
const { Models: { DataStore, DataObject } } = frame;

const KEYS = {
	id: { },
	server_id: { },
	channel_id: { },
	message_id: { },
	log: { },
}

export class BanPost extends DataObject {	
	constructor(store, keys, data) {
		super(store, keys, data);
		this.resolved = {};
	}
}

export class BanPostStore extends DataStore {
	constructor(bot, db) {
		super(bot, db)
	}

	async init() {
		await this.db.query(`CREATE TABLE IF NOT EXISTS ban_posts (
			id 					SERIAL PRIMARY KEY,
			server_id		TEXT,
			channel_id	TEXT,
			message_id	TEXT,
			log 				TEXT
		)`)
	}

	async create(data = {}) {
		try {
			var c = await this.db.query(`INSERT INTO ban_posts (
				server_id,
				channel_id,
				message_id,
				log
			) VALUES ($1,$2,$3,$4)
			RETURNING id`,
			[data.server_id, data.channel_id, data.message_id, data.log]);
		} catch(e) {
			console.log(e);
	 		return Promise.reject(e.message);
		}
		
		return await this.getID(c.rows[0].id);
	}

	async get(server, hid) {
		try {
			var data = await this.db.query(`SELECT * FROM ban_posts WHERE host = $1 and hid = $2`,[server, hid]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			return new BanPost(this, KEYS, data.rows[0]);
		} else return new BanPost(this, KEYS, {host: server});
	}

	async getID(id) {
		try {
			var data = await this.db.query(`SELECT * FROM ban_posts WHERE id = $1`,[id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			return new BanPost(this, KEYS, data.rows[0]);
		} else return new BanPost(this, KEYS, {});
	}

	async getAll(server) {
		try {
			var data = await this.db.query(`SELECT * FROM ban_posts WHERE host = $1`,[server]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		if(data.rows?.[0]) {
			return data.rows.map(x => new BanPost(this, KEYS, x));
		} else return undefined;
	}

	async update(id, data = {}) {
		try {
			await this.db.query(`UPDATE ban_posts SET ${Object.keys(data).map((k, i) => k+"=$"+(i+2)).join(",")} WHERE id = $1`,[id, ...Object.values(data)]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		return await this.getID(id);
	}

	async delete(id) {
		try {
			await this.db.query(`DELETE FROM ban_posts WHERE id = $1`, [id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		return;
	}
}

export default (bot, db) => new BanPostStore(bot, db);