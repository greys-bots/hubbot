// adds color and banner to submissions

export default async (bot, db) => {
	var columns = await db.query(`
		select column_name from information_schema.columns
		where table_name = 'submissions'`);
	if(columns.rows?.[0] && columns.rows.find(x => x.column_name == 'color'))
		return;

	await db.query(`
		ALTER TABLE submissions ADD COLUMN color TEXT;
		ALTER TABLE submissions ADD COLUMN banner_url TEXT;
	`);
	return;
}