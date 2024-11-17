const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;
const cors = require('cors');

// Enable CORS
app.use(cors());

// PostgreSQL connection setup
const pool = new Pool({
  user: 'postgres', // Replace with your PostgreSQL username
  host: 'localhost',
  database: 'my_fitness_zone',
  password: 'DataDev2024', // Replace with your PostgreSQL password
  port: 5432,
});

// Middleware
app.use(express.json());

// JWT Secret (use a secure secret in production)
const JWT_SECRET = 'your_jwt_secret_key'; // Replace with a strong secret key

// Routes
// 1. Fetch all users
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT user_id, name, email, created_at FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// 2. Register a new user
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if email is already in use
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'Email is already in use' });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING user_id, name, email, created_at',
      [name, email, hashedPassword]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// 3. Authenticate user (Login)
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    console.log(`Login attempt for email: ${email}`);
  
    try {
      const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (user.rows.length === 0) {
        console.log('No user found with this email.');
        return res.status(400).json({ message: 'Invalid credentials' });
      }
  
      const isMatch = await bcrypt.compare(password, user.rows[0].password_hash);
      if (!isMatch) {
        console.log(`Login attempt for email: ${email}`);
        console.log('Entered password:', password);
        console.log('Stored hash:', user.rows[0].password_hash);
        console.log('Password does not match.');
        return res.status(400).json({ message: 'Invalid credentials' });
      }
      
  
      const token = jwt.sign({ user_id: user.rows[0].user_id }, JWT_SECRET, { expiresIn: '1h' });
      console.log('Login successful.');
      res.json({ token, user: { user_id: user.rows[0].user_id, name: user.rows[0].name, email: user.rows[0].email } });
    } catch (err) {
      console.error('Error during login:', err.message);
      res.status(500).send('Server error');
    }
  });
  

// 4. Protected route example
app.get('/api/protected', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ message: 'Welcome to the protected route!', user_id: decoded.user_id });
  } catch (err) {
    console.error(err.message);
    res.status(401).json({ message: 'Invalid token' });
  }
});

// 5. Update a user
app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email } = req.body;

  try {
    const result = await pool.query(
      'UPDATE users SET name = $1, email = $2 WHERE user_id = $3 RETURNING *',
      [name, email, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// 6. Delete a user
app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM users WHERE user_id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Start the server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

