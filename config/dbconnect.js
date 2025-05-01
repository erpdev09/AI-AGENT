require('dotenv').config(); // Load environment variables from .env

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
