import frame from 'frame';
const { Models: { DataStore, DataObject } } = frame;

const KEYS = {
	id: { },
	server_id: { },
	channel_id: { },
	message_id: { },
	report: { }
}

export class ReportPost extends DataObject {	
	constructor(store, keys, data) {
		super(store, keys, data);
	}
}

export class ReportPostStore extends DataStore {
	constructor(bot, db) {
		super(bot, db)
	}

	async init() {
		await this.db.query(`CREATE TABLE IF NOT EXISTS report_posts (
			id 					SERIAL PRIMARY KEY,
			server_id 			TEXT,
			channel_id		 	TEXT,
			message_id			TEXT,
			report 				TEXT
		)`)
	}

	async create(data = {}) {
		try {
			var c = await this.db.query(`INSERT INTO report_posts (
				server_id,
				channel_id,
				message_id,
				report
			) VALUES ($1,$2,$3,$4)
			RETURNING id`,
			[data.server_id, data.channel_id, data.message_id,
			 data.report]);
		} catch(e) {
			console.log(e);
	 		return Promise.reject(e.message);
		}
		
		return await this.getID(c.rows[0].id);
	}

	async index(data = {}) {
		try {
			await this.db.query(`INSERT INTO report_posts (
				server_id,
				channel_id,
				message_id,
				report
			) VALUES ($1,$2,$3,$4)`,
			[data.server_id, data.channel_id, data.message_id,
			 data.report]);
		} catch(e) {
			console.log(e);
	 		return Promise.reject(e.message);
		}
		
		return;
	}

	async get(server, message) {
		try {
			var data = await this.db.query(`SELECT * FROM report_posts WHERE server_id = $1 AND message_id = $2`,[server, message]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			return new ReportPost(this, KEYS, data.rows[0]);
		} else return new ReportPost(this, KEYS, {server_id: server});
	}

	async getID(id) {
		try {
			var data = await this.db.query(`SELECT * FROM report_posts WHERE id = $1`,[id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			return new ReportPost(this, KEYS, data.rows[0]);
		} else return new ReportPost(this, KEYS, {});
	}

	async update(id, data = {}) {
		try {
			await this.db.query(`UPDATE report_posts SET ${Object.keys(data).map((k, i) => k+"=$"+(i+2)).join(",")} WHERE id = $1`,[id, ...Object.values(data)]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		return await this.getID(id);
	}

	async delete(id) {
		try {
			await this.db.query(`DELETE FROM report_posts WHERE id = $1`, [id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		return;
	}
}

export default (bot, db) => new ReportPostStore(bot, db);