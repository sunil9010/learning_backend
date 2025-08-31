const express = require('express');
const { MongoClient } = require('mongodb');
const router = express.Router();

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

// Route: /api/content/mcq/:courseId/:phaseId/:moduleId/:mcqSetId
router.get('/:courseId/:phaseId/:moduleId/:mcqSetId', async (req, res) => {
  const { courseId, phaseId, moduleId, mcqSetId } = req.params;

  try {
    await client.connect();
    const db = client.db('test');
    const mcq = await db.collection('mcqs').findOne({
      courseId,
      phaseId,
      moduleId,
      mcqSetId
    });

    if (mcq) {
      res.json(mcq);
      console.log(mcq)
    } else {
      res.status(404).json({ message: 'MCQ not found' });
    }
  } catch (error) {
    console.error('Error fetching MCQ:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
