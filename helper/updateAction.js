const express = require('express');
const router = express.Router();
const pool = require('../config/dbconnect'); // adjust path if needed

// POST /updateAction
router.post('/updateAction', async (req, res) => {
  const { tweet_link_extra, action_perform } = req.body;

  if (!tweet_link_extra) {
    return res.status(400).json({ error: 'Missing tweet_link_extra' });
  }

  try {
    const query = `
      UPDATE tweets1
      SET action_perform = $1
      WHERE tweet_link_extra = $2
    `;
    const values = [action_perform === true, tweet_link_extra];

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'No tweet found to update' });
    }

    res.status(200).json({ message: '✅ Action updated successfully' });
  } catch (err) {
    console.error('❌ Error updating tweets1:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
