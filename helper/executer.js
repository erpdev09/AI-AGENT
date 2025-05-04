const axios = require('axios');

async function triggerTodoActivity() {
  const query = 'swap,hello';
  const url = `http://localhost:4500/todoactivity?query=${encodeURIComponent(query)}`;

  try {
    const response = await axios.get(url);
    console.log('✅ Response from /todoactivity:', response.data);
  } catch (error) {
    console.error('❌ Error triggering /todoactivity:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Body:', error.response.data);
    }
  }
}

triggerTodoActivity();
