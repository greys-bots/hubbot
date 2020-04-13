module.exports = {
	getConfig: async (bot, id)=> {
		return new Promise(res=>{
			bot.db.query(`SELECT * FROM configs WHERE server_id=?`,[id], {
				id: Number,
		        server_id: String,
		        banlog_channel: String,
		        ban_message: String,
		        reprole: String,
		        delist_channel: String,
		        starboard: JSON.parse,
		        blacklist: JSON.parse,
		        feedback: JSON.parse
			}, (err,rows)=>{
				if(err) {
					console.log("config err")
					console.log(err);
					res(false);
				} else {
					res(rows[0]);
				}
			})
		})
	},
	updateConfig: async function(bot, srv, data) {
		return new Promise((res)=> {
			bot.db.query(`SELECT * FROM configs WHERE server_id=?`,[srv], (err, rows)=> {
				if(err) {
					console.log(err);
					res(false);
				} else {
					if(!rows[0]) {
						bot.db.query(`INSERT INTO configs 
									 (server_id, banlog_channel, ban_message, reprole, delist_channel, starboard, blacklist, feedback) VALUES 
									 (?,?,?,?,?,?,?,?)`,
									 [srv, data.banlog_channel || "", data.ban_message || "", data.reprole || "", data.delist_channel || "",
									 data.starboard || {}, data.blacklist || [], data.feedback || {}])
					} else {
						bot.db.query(`UPDATE configs SET ${Object.keys(data).map((k) => k+"=?").join(",")} WHERE server_id=?`,[...Object.values(data), srv], (err, rows)=> {
							if(err) {
								console.log(err);
								res(false)
							} else {
								res(true)
							}
						})
					}					
				}
			})
		})
	},
	deleteConfig: async (bot, id) => {
		return new Promise(res => {
			bot.db.query(`DELETE FROM configs WHERE server_id = ?`, [id], (err, rows)=> {
				if(err) {
					console.log(err);
					res(false);
				} else res(true);
			})
		})
	}
}