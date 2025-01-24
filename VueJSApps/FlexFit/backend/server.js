const express = require('express');
const sql = require('mssql');
const dbConfig = require('./dbConfig');

const app = express();
app.use(express.json());

// Establish a connection pool
const pool = new sql.ConnectionPool(dbConfig);
const poolConnect = pool.connect();

pool.on('error', err => {
  console.error('SQL Pool Error', err);
});

// Route to test database connection
app.get('/api/test-connection', async (req, res) => {
  try {
    await poolConnect; // Wait for the connection pool to be ready
    const result = await pool.request().query('SELECT 1 AS test'); // Sample query
    res.status(200).json({ message: 'Connection successful!', result: result.recordset });
  } catch (err) {
    console.error('SQL Error', err);
    res.status(500).json({ error: 'Database connection failed', details: err.message });
  }
});

// Example route to fetch data
app.get('/api/users', async (req, res) => {
  try {
    await poolConnect;
    const result = await pool.request().query('SELECT * FROM Users'); // Adjust your query
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('SQL Error', err);
    res.status(500).json({ error: 'Failed to fetch users', details: err.message });
  }
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
