import 'dotenv/config';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });

const bibleTables = [
  '"BibleVersion"',
  '"BibleBook"',
  '"BibleChapter"',
  '"BibleVerse"'
];

async function backupBibleTables() {
  for (const table of bibleTables) {
    const res = await pool.query(`SELECT * FROM ${table}`);
    const rows = res.rows;
    const { writeFileSync } = await import('fs');
    writeFileSync(
      `bkp_${table.replace(/"/g, '')}.json`,
      JSON.stringify(rows, null, 2)
    );
    console.log(`Backed up ${table} (${rows.length} rows)`);
  }
}

backupBibleTables()
  .then(() => { console.log('✅ Bible tables backed up.'); process.exit(0); })
  .catch(e => { console.error(e); process.exit(1); });
