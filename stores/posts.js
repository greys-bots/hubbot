const { Models: { DataStore, DataObject } } = require('frame');

const KEYS = {
	id: { },
	server_id: { },
	channel_id: { },
	message_id: { },
	submission: { }
}

class Post extends DataObject {	
	constructor(store, keys, data) {
		super(store, keys, data);
	}
}

class PostStore extends DataStore {
	constructor(bot, db) {
		super(bot, db)
	}

	async init() {
		await this.db.query(`CREATE TABLE IF NOT EXISTS posts (
			id 					SERIAL PRIMARY KEY,
			server_id 			TEXT,
			channel_id		 	TEXT,
			message_id			TEXT,
			submission 			TEXT
		)`)

		this.bot.on('channelDelete', async (ch) => {
			await this.deleteByChannel(ch.guild.id, ch.id)
		})

		this.bot.on('messageDelete', async (m) => {
			await this.deleteByMessage(m.guild.id, m.channel.id, m.id)
		})
	}

	async create(data = {}) {
		try {
			var c = await this.db.query(`INSERT INTO posts (
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
			await this.db.query(`INSERT INTO posts (
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
			var data = await this.db.query(`SELECT * FROM posts WHERE server_id = $1 AND message_id = $2`,[server, message]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			return new Post(this, KEYS, data.rows[0]);
		} else return new Post(this, KEYS, {server_id: server});
	}

	async getID(id) {
		try {
			var data = await this.db.query(`SELECT * FROM posts WHERE id = $1`,[id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			return new Post(this, KEYS, data.rows[0]);
		} else return new Post(this, KEYS, {});
	}

	async getBySubmission(server, sub) {
		try {
			var data = await this.db.query(`SELECT * FROM posts WHERE server_id = $1 AND submission = $2`,[server, sub]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			return data.rows.map(p => new Post(this, KEYS, p));
		} else return undefined;
	}

	async update(id, data = {}) {
		try {
			await this.db.query(`UPDATE posts SET ${Object.keys(data).map((k, i) => k+"=$"+(i+2)).join(",")} WHERE id = $1`,[id, ...Object.values(data)]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		return await this.getID(id);
	}

	async delete(id) {
		try {
			await this.db.query(`DELETE FROM posts WHERE id = $1`, [id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		return;
	}

	async deleteByChannel(server, channel) {
		try {
			await this.db.query(`DELETE FROM posts WHERE server_id = $1 AND channel_id = $2`, [server, channel]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		return;
	}

	async deleteByMessage(server, channel, message) {
		try {
			await this.db.query(`DELETE FROM posts WHERE server_id = $1 AND channel_id = $2 AND message_id = $3`, [server, channel, message]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		return;
	}
}

module.exports = (bot, db) => new PostStore(bot, db);