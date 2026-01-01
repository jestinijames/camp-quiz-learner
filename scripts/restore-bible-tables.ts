import 'dotenv/config';
import { Pool } from 'pg';
import { readFileSync } from 'fs';

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });

const bibleTables = [
  'BibleVersion',
  'BibleBook',
  'BibleChapter',
  'BibleVerse'
];

async function restoreBibleTables() {
  for (const table of bibleTables) {
    const data = JSON.parse(readFileSync(`bkp_${table}.json`, 'utf-8'));
    if (data.length === 0) continue;
    // Build columns and values
    const columns = Object.keys(data[0]);
    const values = data.map(row =>
      '(' + columns.map(col =>
        row[col] === null ? 'NULL' : `'${String(row[col]).replace(/'/g, "''")}'`
      ).join(',') + ')'
    );
    // Truncate table first
    await pool.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`);
    // Insert all rows
    await pool.query(
      `INSERT INTO "${table}" (${columns.map(c => '"'+c+'"').join(',')}) VALUES ${values.join(',')}`
    );
    console.log(`Restored ${table} (${data.length} rows)`);
  }
}

restoreBibleTables()
  .then(() => { console.log('✅ Bible tables restored.'); process.exit(0); })
  .catch(e => { console.error(e); process.exit(1); });
