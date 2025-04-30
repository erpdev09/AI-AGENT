const axios = require('axios'); // Import axios

async function queryWeaviate() {
  const query = `
    query {
      Get {
        SocialPost(nearText: {concepts: ["dirty"]}) {
          text
          user
          timestamp
        }
      }
    }
  `;

  try {
    const response = await axios.post(
      'http://localhost:8080/v1/graphql', // Weaviate GraphQL endpoint
      { query }, // GraphQL query as the request body
      {
        headers: {
          'Content-Type': 'application/json', // Set the correct content type
        },
      }
    );

    // Check and log the response data
    console.log('Query Results:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error querying Weaviate:', error.message);
  }
}

queryWeaviate();
