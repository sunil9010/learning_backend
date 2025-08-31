const express = require('express');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// POST /api/register
// POST /api/register
router.post('/register', async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  const trimmedEmail = email?.trim().toLowerCase();
  console.log('Email used for signup:', JSON.stringify(trimmedEmail));

  if (!trimmedEmail || !/^[a-zA-Z0-9._%+-]+@clarifox\.com$/.test(trimmedEmail)) {
    return res.status(400).json({ 
      message: 'Email must be a valid clarifox.com address (e.g., user@clarifox.com)' 
    });
  }

  try {
    // 🔧 Remove options.data
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
    });

    if (signUpError) {
      console.error('Supabase signup error:', signUpError);
      return res.status(400).json({ 
        message: signUpError.message || 'Registration failed' 
      });
    }

    // Optional: Update metadata in `profiles` table via RLS-safe call
    // You must ensure the user's `id` exists and you have a `profiles` table linked with foreign key to `auth.users.id`
    const userId = signUpData.user?.id;
    if (userId) {
      await supabase.from('profiles').upsert({
        id: userId,
        first_name: firstName,
        last_name: lastName
      });
    }

    res.json({
      message: 'Registration successful. Please check your email for verification link.',
      user: signUpData.user,
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Internal server error during registration' 
    });
  }
});



// POST /api/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  // Check if user is verified
  if (!signInData.user?.email_confirmed_at) {
    return res.status(403).json({ message: 'Please verify your email before logging in.' });
  }

  res.json({
    message: 'Login successful',
    session: signInData.session,
    user: signInData.user,
  });
});

// POST /api/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://your-frontend-url.com/reset-password', // customize this!
  });

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  res.json({ message: 'Password reset email sent. Check your inbox.' });
});

module.exports = router;
