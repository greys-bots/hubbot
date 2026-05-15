// adds contacts to submissions

export default async (bot, db) => {
	var columns = await db.query(`
		select column_name from information_schema.columns
		where table_name = 'submissions'`);
	if(columns.rows?.[0] && columns.rows.find(x => x.column_name == 'contacts'))
		return;

	await db.query(`
		ALTER TABLE submissions ADD COLUMN contacts TEXT[];
	`);
	return;
}