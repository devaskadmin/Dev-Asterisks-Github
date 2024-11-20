const { Pool } = require('pg');

// PostgreSQL connection pool
const pool = new Pool({
  user: 'postgres', // Replace with your PostgreSQL username
  host: 'localhost',
  database: 'my_fitness_zone', // Replace with your database name
  password: 'DataDev2024', // Replace with your PostgreSQL password
  port: 5432,
});

module.exports = pool;