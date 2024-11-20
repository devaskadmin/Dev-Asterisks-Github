const pool = require('./connection');

// Get all users
const getUsers = async () => {
  const result = await pool.query('SELECT * FROM users');
  return result.rows;
};

// Add a new user
const addUser = async (name, email) => {
  const result = await pool.query(
    'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
    [name, email]
  );
  return result.rows[0];
};

module.exports = { getUsers, addUser };
