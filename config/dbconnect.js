
const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'my_new_database',
    password: 'Koireng@1', 
    port: 5432,
});

// Optional: Test the connection on startup
pool.connect((err, client, release) => {
    if (err) {
        console.error('Error connecting to PostgreSQL:', err.stack);
        return;
    }
    console.log('Connected to PostgreSQL database "my_new_database"');
    release();
});
module.exports = pool;