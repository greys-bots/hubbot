// changes category to be an array of ids
// and adds multicategory to config

export default async (bot, db) => {
	var columns = await db.query(`
		select column_name from information_schema.columns
		where table_name = 'configs'`);
	if(columns.rows?.[0] && columns.rows.find(x => x.column_name == 'multicategory'))
		return;

	await db.query(`
		ALTER TABLE configs ADD COLUMN multicategory BOOLEAN;
		ALTER TABLE submissions ALTER COLUMN category TYPE text[]
			USING array[category];
	`);
	return;
}