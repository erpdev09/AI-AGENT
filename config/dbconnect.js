const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Check if the environment variables are loaded correctly
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
console.log('DB_PORT:', process.env.DB_PORT);

// Set up PostgreSQL Pool
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

// Optional: Test the connection on startup
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Error connecting to PostgreSQL:', err.stack);
        return;
    }
    console.log(`✅ Connected to PostgreSQL database "${process.env.DB_NAME}"`);
    release();
});

module.exports = pool;
