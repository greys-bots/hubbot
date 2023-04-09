const { Models: { DataStore, DataObject } } = require('frame');

const KEYS = {
	id: { },
	server_id: { },
	channel_id: { },
	message_id: { },
	submission: { }
}

class SubmissionPost extends DataObject {	
	constructor(store, keys, data) {
		super(store, keys, data);
	}
}

class SubmissionPostStore extends DataStore {
	constructor(bot, db) {
		super(bot, db)
	}

	async init() {
		await this.db.query(`CREATE TABLE IF NOT EXISTS submission_posts (
			id 					SERIAL PRIMARY KEY,
			server_id 			TEXT,
			channel_id		 	TEXT,
			message_id			TEXT,
			submission 			TEXT
		)`)
	}

	async create(data = {}) {
		try {
			var c = await this.db.query(`INSERT INTO submission_posts (
				server_id,
				channel_id,
				message_id,
				submission
			) VALUES ($1,$2,$3,$4)
			RETURNING id`,
			[data.server_id, data.channel_id, data.message_id,
			 data.submission]);
		} catch(e) {
			console.log(e);
	 		return Promise.reject(e.message);
		}
		
		return await this.getID(c.rows[0].id);
	}

	async index(data = {}) {
		try {
			await this.db.query(`INSERT INTO submission_posts (
				server_id,
				channel_id,
				message_id,
				submission
			) VALUES ($1,$2,$3,$4)`,
			[data.server_id, data.channel_id, data.message_id,
			 data.submission]);
		} catch(e) {
			console.log(e);
	 		return Promise.reject(e.message);
		}
		
		return;
	}

	async get(server, message) {
		try {
			var data = await this.db.query(`SELECT * FROM submission_posts WHERE server_id = $1 AND message_id = $2`,[server, message]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			return new SubmissionPost(this, KEYS, data.rows[0]);
		} else return new SubmissionPost(this, KEYS, {server_id: server});
	}

	async getID(id) {
		try {
			var data = await this.db.query(`SELECT * FROM submission_posts WHERE id = $1`,[id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			return new SubmissionPost(this, KEYS, data.rows[0]);
		} else return new SubmissionPost(this, KEYS, {});
	}

	async update(id, data = {}) {
		try {
			await this.db.query(`UPDATE submission_posts SET ${Object.keys(data).map((k, i) => k+"=$"+(i+2)).join(",")} WHERE id = $1`,[id, ...Object.values(data)]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		return await this.getID(id);
	}

	async delete(id) {
		try {
			await this.db.query(`DELETE FROM submission_posts WHERE id = $1`, [id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		return;
	}
}

module.exports = (bot, db) => new SubmissionPostStore(bot, db);