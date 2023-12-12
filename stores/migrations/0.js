module.exports = async (bot, db) => {
	var columns = await db.query(`
		select column_name from information_schema.columns
		where table_name = 'configs'`);
	if(columns.rows?.[0] && columns.rows.find(x => x.column_name == 'report_channel'))
		return;

	await db.query(`
		ALTER TABLE configs ADD COLUMN report_channel TEXT;
	`);
	return;
}