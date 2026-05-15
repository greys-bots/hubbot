// adds status to submissions and reports

export default async (bot, db) => {
	var columns = await db.query(`
		select column_name from information_schema.columns
		where table_name = 'reports'`);
	if(columns.rows?.[0] && columns.rows.find(x => x.column_name == 'status'))
		return;

	await db.query(`
		ALTER TABLE reports ADD COLUMN status TEXT;
		ALTER TABLE submissions ADD COLUMN status TEXT;
	`);
	return;
}