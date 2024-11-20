const express = require('express');
const cors = require('cors');
const { getUsers, addUser } = require('./db-postgres/queries'); // Import query functions

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/users', async (req, res) => {
  try {
    const users = await getUsers();
    res.json(users);
  } catch (error) {
    res.status(500).send('Error fetching users');
  }
});

app.post('/api/users', async (req, res) => {
  const { name, email } = req.body;
  try {
    const newUser = await addUser(name, email);
    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).send('Error adding user');
  }
});

app.get('/view-profile', (req, res) => {
  console.log(`Request received at ${req.path}`);
  res.sendFile(path.join(__dirname, '../dist/index.html')); 
});








// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

