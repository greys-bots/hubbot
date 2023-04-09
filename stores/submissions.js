const { Models: { DataStore, DataObject } } = require('frame');

const KEYS = {
	id: { },
	hid: { },
	host: { },
	server_id: { },
	user_id: { },
	name: { patch: true},
	description: { patch: true },
	link: { patch: true },
	icon_url: { patch: true },
	category: { patch: true },
	tags: { patch: true }
}

class Submission extends DataObject {	
	constructor(store, keys, data) {
		super(store, keys, data);
		this.resolved = {};
	}

	async getTags() {
		if(!this.tags?.length) return;
		var tags = await this.store.bot.stores.tags.getByHids(
			this.host,
			this.tags
		)

		this.resolved.tags = tags;
		return tags;
	}

	async getCategory() {
		if(!this.category) return;
		var cat = await this.store.bot.stores.categories.get(
			this.host,
			this.category
		)

		this.resolved.category = cat;
		return cat;
	}

	async getPosts() {
		var posts = await this.store.bot.stores.posts.getBySubmission(
			this.host,
			this.hid
		);

		this.resolved.posts = posts;
		return posts;
	}

	async updatePosts(ctx) {
		var posts = await this.getPosts();
		await this.getTags();

		var chans = {};
		var errs = [];
		for(var p of posts) {
			try {
				if(!chans[p.channel_id]) {
					chans[p.channel_id] = await ctx.guild.channels.fetch(p.channel_id);
				}

				var ch = chans[p.channel_id];
				var m = await ch.messages.fetch(p.message_id);

				await m.edit(this.genPost())
			} catch(e) {
				errs.push({
					message: p.message_id,
					channel: p.channel_id,
					error: e.message ?? e
				})
			}
		}

		return errs;
	}

	genPost() {
		return {embeds: [{
			title: this.name,
			description: this.description,
			fields: [
				{
					name: 'Link',
					value: this.link
				},
				{
					name: "Tags",
					value: this.resolved?.tags?.map(t => t.name).join(", ") ?? '(not set)'
				}
			],
			footer: {
				text: `Server ID: ${this.hid}`
			},
			thumbnail: {
				url: this.icon_url
			}
		}]}
	}
}

class SubmissionStore extends DataStore {
	constructor(bot, db) {
		super(bot, db)
	}

	async init() {
		await this.db.query(`CREATE TABLE IF NOT EXISTS submissions (
			id 					SERIAL PRIMARY KEY,
			hid		 			TEXT,
			host 				TEXT,
			server_id		 	TEXT,
			user_id				TEXT,
			name 				TEXT,
			description 		TEXT,
			link 				TEXT,
			icon_url 			TEXT,
			category			TEXT,
			tags 				TEXT[]
		)`)
	}

	async create(data = {}) {
		try {
			var c = await this.db.query(`INSERT INTO submissions (
				hid,
				host,
				server_id,
				user_id,
				name,
				description,
				link,
				icon_url,
				category,
				tags
			) VALUES (find_unique('submissions'), $1,$2,$3,$4,$5,$6,$7,$8,$9)
			RETURNING id`,
			[data.host, data.server_id, data.user_id, data.name, data.description,
			 data.link, data.icon_url, data.category, data.tags]);
		} catch(e) {
			console.log(e);
	 		return Promise.reject(e.message);
		}
		
		return await this.getID(c.rows[0].id);
	}

	async index(data = {}) {
		try {
			await this.db.query(`INSERT INTO submissions (
				hid,
				host,
				server_id,
				user_id,
				name,
				description,
				link,
				icon_url,
				category,
				tags
			) VALUES (find_unique('submissions'), $1,$2,$3,$4,$5,$6,$7,$8,$9)`,
			[data.host, data.server_id, data.user_id, data.name, data.description,
			 data.link, data.icon_url, data.category, data.tags]);
		} catch(e) {
			console.log(e);
	 		return Promise.reject(e.message);
		}
		
		return;
	}

	async get(server, hid) {
		try {
			var data = await this.db.query(`SELECT * FROM submissions WHERE host = $1 and hid = $2`,[server, hid]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			return new Submission(this, KEYS, data.rows[0]);
		} else return new Submission(this, KEYS, {host: server});
	}

	async getID(id) {
		try {
			var data = await this.db.query(`SELECT * FROM submissions WHERE id = $1`,[id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			return new Submission(this, KEYS, data.rows[0]);
		} else return new Submission(this, KEYS, {});
	}

	async getAll(server) {
		try {
			var data = await this.db.query(`SELECT * FROM submissions WHERE host = $1`,[server]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		if(data.rows?.[0]) {
			return data.rows.map(x => new Submission(this, KEYS, x));
		} else return undefined;
	}

	async update(id, data = {}) {
		try {
			await this.db.query(`UPDATE submissions SET ${Object.keys(data).map((k, i) => k+"=$"+(i+2)).join(",")} WHERE id = $1`,[id, ...Object.values(data)]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		return await this.getID(id);
	}

	async delete(id) {
		try {
			await this.db.query(`DELETE FROM submissions WHERE id = $1`, [id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		return;
	}

	async search(server, query, tag, cat) {
		try {
			var data = await this.db.query(`SELECT * FROM submissions WHERE host = $1`,[server]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		var subs = data.rows;
		if(query) {
			subs = subs.filter(x => (
				x.name.toLowerCase().includes(query) ||
				x.description.toLowerCase().includes(query)
			))
		}

		if(tag) {
			subs = subs.filter(x => x.tags.includes(tag));
		}

		if(cat) {
			subs = subs.filter(x => x.category == cat)
		}

		if(subs.length) {
			return subs.map(x => new Submission(this, KEYS, x));
		} else return undefined;
	}
}

module.exports = (bot, db) => new SubmissionStore(bot, db);