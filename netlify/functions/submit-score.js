const { Client } = require('pg');
const { handler: asyncHandler } = require('@netlify/functions');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  const { player_name, score } = JSON.parse(event.body);

  if (typeof player_name !== 'string' || player_name.length !== 3 || typeof score !== 'number') {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Bad Request' }),
    };
  }

  try {
    await client.connect();
    const queryText = 'INSERT INTO leaderboard(player_name, score) VALUES($1, $2) RETURNING *';
    const res = await client.query(queryText, [player_name, score]);
    await client.end();

    return {
      statusCode: 200,
      body: JSON.stringify(res.rows[0]),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};

exports.handler = asyncHandler(handler);
