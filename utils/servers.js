module.exports = {
	getServers: async (bot, host) => {
		return new Promise((res)=>{
			bot.db.query(`SELECT * FROM servers WHERE host_id=?`,[host], {
				id: Number,
				host_id: String,
				server_id: String,
				contact_id: String,
				name: String,
				description: String,
				invite: String,
				pic_url: String,
				visibility: Boolean
			}, (err,rows)=>{
				if(err) {
					console.log(err);
					res(undefined)
				} else {
					if(!rows[0]) return res(undefined);

					for(var i = 0; i < rows.length; i++) {
						rows[i].guild = bot.guilds.find(g => g.id == rows[i].server_id);
					}
					res(rows);
				}
			})
		})
	},
	getServer: async (bot, host, id) => {
		return new Promise((res)=>{
			bot.db.query(`SELECT * FROM servers WHERE host_id=? AND server_id=?`,[host, id], {
				id: Number,
				host_id: String,
				server_id: String,
				contact_id: String,
				name: String,
				description: String,
				invite: String,
				pic_url: String,
				visibility: Boolean
			}, (err,rows)=>{
				if(err) {
					console.log(err);
					res(undefined)
				} else {
					if(!rows[0]) return res(undefined);

					rows[0].guild = bot.guilds.find(g => g.id == id);
					res(rows[0]);
				}
			})
		})
	},
	getServerByID: async (bot, id) => {
		return new Promise((res)=>{
			bot.db.query(`SELECT * FROM servers WHERE server_id=?`,[id], {
				id: Number,
				host_id: String,
				server_id: String,
				contact_id: String,
				name: String,
				description: String,
				invite: String,
				pic_url: String,
				visibility: Boolean
			}, (err,rows)=>{
				if(err) {
					console.log(err);
					res(undefined)
				} else {
					if(!rows[0]) return res(undefined);

					rows[0].guild = bot.guilds.find(g => g.id == rows[0].server_id);
					res(rows[0]);
				}
			})
		})
	},
	getServerByRowID: async (bot, id) => {
		return new Promise((res)=>{
			bot.db.query(`SELECT * FROM servers WHERE id=?`,[id], {
				id: Number,
				host_id: String,
				server_id: String,
				contact_id: String,
				name: String,
				description: String,
				invite: String,
				pic_url: String,
				visibility: Boolean
			}, (err,rows)=>{
				if(err) {
					console.log(err);
					res(undefined)
				} else {
					rows[0].guild = bot.guilds.find(g => g.id == rows[0].server_id);
					res(rows[0]);
				}
			})
		})
	},
	getServersWithContact: async (bot, host, id) => {
		return new Promise((res)=>{
			bot.db.query(`SELECT * FROM servers WHERE host_id=? AND contact_id LIKE ?`,[host, "%"+id+"%"], {
				id: Number,
				host_id: String,
				server_id: String,
				contact_id: String,
				name: String,
				description: String,
				invite: String,
				pic_url: String,
				visibility: Boolean
			}, (err,rows)=>{
				if(err) {
					console.log(err);
					res(undefined)
				} else {
					if(!rows[0]) return res(undefined);

					rows[0].guild = bot.guilds.find(g => g.id == rows[0].server_id);
					res(rows);
				}
			})
		})
	},
	addServer: async (bot, host, server, name, invite, image) => {
		return new Promise(res => {
			bot.db.query(`INSERT INTO servers (host_id, server_id, name, invite, pic_url) VALUES (?,?,?,?,?)`, [host, server, name, invite, image], (err, rows) => {
				if(err) {
					console.log(err);
					res(false)
				} else res(true);
			});
		})
	},
	updateHostedServer: async (bot, host, id, data)=> {
		return new Promise(res=>{
			bot.db.query(`UPDATE servers SET ${Object.keys(data).map((k) => k+"=?").join(",")} WHERE host_id = ? AND server_id=?`, [...Object.values(data), host, id], (err, rows)=>{
				if(err) {
					console.log(err);
					res(false);
				} else {
					res(true);
				}
			});
		})
	},
	updateServer: async (bot, id, data)=> {
		return new Promise(res=>{
			bot.db.query(`UPDATE servers SET ${Object.keys(data).map((k) => k+"=?").join(",")} WHERE server_id=?`, [...Object.values(data), id], (err, rows)=>{
				if(err) {
					console.log(err);
					res(false);
				} else {
					res(true);
				}
			});
		})
	},
	deleteServer: async (bot, host, id) => {
		return new Promise(res => {
			bot.db.query('DELETE FROM servers WHERE id=?',[id],(err,rows)=>{
				if(err) {
					cosole.log(err);
					res(false)
				} else {
					bot.db.query('DELETE FROM posts WHERE host_id=? AND server_id=?',[host, id],(err,rows)=>{
						if(err) {
							cosole.log(err);
							res(false)
						} else {
							res(true)
						}
					})
				}
			})
		})
	},
	deleteServers: async (bot, host) => {
		return new Promise(res => {
			bot.db.query('DELETE FROM servers WHERE host = ?',[host], async (err,rows)=>{
				if(err) {
					cosole.log(err);
					res(false)
				} else {
					var scc = await bot.utils.deleteAllPosts(bot, host);
					res(scc)
				}
			})
		})
	},
	findServers: async (bot, host, name) => {
		return new Promise(res => {
			bot.db.query(`SELECT * FROM servers WHERE host_id=? AND name LIKE ?`,[host, "%"+name+"%"], {
				id: Number,
				host_id: String,
				server_id: String,
				contact_id: String,
				name: String,
				description: String,
				invite: String,
				pic_url: String,
				visibility: Boolean
			}, (err, rows)=>{
				if(err) {
					console.log(err);
					res(undefined);
				} else {
					if(!rows[0]) return res(undefined);

					for(var i = 0; i < rows.length; i++) {
						rows[i].guild = bot.guilds.find(g => g.id == rows[i].server_id);
					}
					res(rows);
				}
			})
		})
	}
}