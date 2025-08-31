// server/routes/coding.js
const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');

// Rate limiting for code execution
const executionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10 // limit each IP to 10 requests per windowMs
});

// POST endpoint to execute Python code
router.post('/execute', executionLimiter, async (req, res) => {
  const { code, testCases } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  try {
    // Create a temporary directory
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    // Create a unique filename
    const filename = `temp_${uuidv4()}.py`;
    const filepath = path.join(tempDir, filename);

    // Write the code to a file
    fs.writeFileSync(filepath, code);

    // Execute the Python code with a timeout
    const execution = exec(`python ${filepath}`, { timeout: 5000 }, (error, stdout, stderr) => {
      // Clean up the file
      try {
        fs.unlinkSync(filepath);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }

      if (error) {
        return res.status(400).json({
          success: false,
          output: stdout,
          error: stderr || error.message
        });
      }

      res.json({
        success: true,
        output: stdout,
        error: stderr
      });
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST endpoint to validate code against test cases
router.post('/validate', executionLimiter, async (req, res) => {
  const { code, testCases } = req.body;
  
  if (!code || !testCases || !Array.isArray(testCases)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    const results = [];
    let allPassed = true;

    // Create a temporary directory
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    // Create a unique filename
    const filename = `temp_${uuidv4()}.py`;
    const filepath = path.join(tempDir, filename);

    // Write the code to a file
    fs.writeFileSync(filepath, code);

    // Process each test case
    for (const testCase of testCases) {
      const input = testCase.input || '';
      const expectedOutput = testCase.expectedOutput || '';

      // Execute the Python code with input
      const execution = exec(`python ${filepath}`, { timeout: 5000 }, (error, stdout, stderr) => {
        if (error) {
          results.push({
            input,
            expectedOutput,
            actualOutput: stdout,
            error: stderr || error.message,
            passed: false
          });
          allPassed = false;
          return;
        }

        const passed = stdout.trim() === expectedOutput.trim();
        if (!passed) allPassed = false;

        results.push({
          input,
          expectedOutput,
          actualOutput: stdout,
          error: stderr,
          passed
        });
      });

      // Write input to stdin if needed
      if (input) {
        execution.stdin.write(input);
        execution.stdin.end();
      }
    }

    // Clean up the file
    try {
      fs.unlinkSync(filepath);
    } catch (cleanupError) {
      console.error('Error cleaning up temp file:', cleanupError);
    }

    res.json({
      success: true,
      allPassed,
      results
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;