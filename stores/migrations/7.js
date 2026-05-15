// adds evidence to reports

export default async (bot, db) => {
	var columns = await db.query(`
		select column_name from information_schema.columns
		where table_name = 'reports'`);
	if(columns.rows?.[0] && columns.rows.find(x => x.column_name == 'evidence'))
		return;

	await db.query(`
		ALTER TABLE reports ADD COLUMN evidence TEXT;
	`);
	return;
}