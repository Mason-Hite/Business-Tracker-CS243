// backend/migrate.mjs
import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./data/business_tracker.db');

console.log('🔄 Running database migration...');

db.serialize(() => {
    db.run(`ALTER TABLE users ADD COLUMN name TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('❌ Name column error:', err.message);
        } else {
            console.log('✅ Added "name" column (or already exists)');
        }
    });

    db.run(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('❌ Role column error:', err.message);
        } else {
            console.log('✅ Added "role" column (or already exists)');
        }
    });
});

db.close(() => {
    console.log('✅ Migration completed successfully!');
    console.log('You can now delete this migrate.mjs file.');
});