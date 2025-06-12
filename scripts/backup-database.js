import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function backupDatabase() {
  console.log("📦 Starting database backup...");
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'database-backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backup = {
    timestamp,
    version: "1.0.0",
    tables: {}
  };

  try {
    // Get all tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);

    console.log(`Found ${tablesResult.rows.length} tables to backup`);

    // Backup each table
    for (const table of tablesResult.rows) {
      const tableName = table.table_name;
      console.log(`Backing up table: ${tableName}`);
      
      const dataResult = await pool.query(`SELECT * FROM ${tableName}`);
      backup.tables[tableName] = {
        rowCount: dataResult.rows.length,
        data: dataResult.rows
      };
    }

    // Save backup file
    const filename = `backup-${timestamp}.json`;
    const filepath = path.join(backupDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));
    
    console.log(`✅ Database backup completed successfully`);
    console.log(`📁 Backup saved to: ${filepath}`);
    console.log(`📊 Tables backed up: ${Object.keys(backup.tables).length}`);
    
    // Generate summary
    Object.entries(backup.tables).forEach(([tableName, tableData]) => {
      console.log(`   - ${tableName}: ${tableData.rowCount} rows`);
    });

    return filepath;
    
  } catch (error) {
    console.error("❌ Database backup failed:", error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

async function restoreDatabase(backupFilePath) {
  console.log("🔄 Starting database restore...");
  
  if (!fs.existsSync(backupFilePath)) {
    throw new Error(`Backup file not found: ${backupFilePath}`);
  }

  const backup = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));
  
  try {
    console.log(`Restoring backup from: ${backup.timestamp}`);
    
    // Restore each table
    for (const [tableName, tableData] of Object.entries(backup.tables)) {
      console.log(`Restoring table: ${tableName} (${tableData.rowCount} rows)`);
      
      // Clear existing data
      await pool.query(`DELETE FROM ${tableName}`);
      
      // Insert backup data
      if (tableData.data.length > 0) {
        const columns = Object.keys(tableData.data[0]);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const columnNames = columns.join(', ');
        
        for (const row of tableData.data) {
          const values = columns.map(col => row[col]);
          await pool.query(
            `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`,
            values
          );
        }
      }
    }
    
    console.log(`✅ Database restore completed successfully`);
    
  } catch (error) {
    console.error("❌ Database restore failed:", error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Command line interface
const command = process.argv[2];
const backupFile = process.argv[3];

if (command === 'backup') {
  backupDatabase().catch(console.error);
} else if (command === 'restore' && backupFile) {
  restoreDatabase(backupFile).catch(console.error);
} else {
  console.log("Usage:");
  console.log("  node backup-database.js backup");
  console.log("  node backup-database.js restore <backup-file-path>");
}