const express = require('express');
const cors = require('cors');
require('dotenv').config(); // always first

const authRoutes = require('./routes/auth');
const mcqRoutes = require('./routes/mcqs'); // <-- Add this
const codingRouter = require('./routes/coding');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

app.use('/api', authRoutes);
app.use('/api/content/mcq', mcqRoutes); // <-- Mount here

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Use api

app.use('/api/coding', codingRouter);