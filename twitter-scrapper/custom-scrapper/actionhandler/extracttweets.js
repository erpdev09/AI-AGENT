const pool = require('./pg'); // Import your PostgreSQL connection pool

// Function to get data from the `tweets1` table
const getTweets = async () => {
    try {
        const client = await pool.connect();
        const res = await client.query('SELECT * FROM tweets1'); // Modify this query as per your requirements
        client.release();
        return res.rows; // Returns the rows from the `tweets1` table
    } catch (err) {
        console.error('❌ Error fetching data from tweets1:', err);
        throw err; // Propagate the error
    }
};

module.exports = { getTweets }; // Export the function to be used elsewhere
