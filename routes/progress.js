import express from 'express';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/progress
// @desc    Get user's progress
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('progress');
    res.json(user.progress || []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/progress/:problemId
// @desc    Update problem progress
// @access  Private
router.post('/:problemId', protect, async (req, res) => {
  try {
    const { problemId } = req.params;
    const { completed, bookmarked, notes } = req.body;

    const user = await User.findById(req.user._id);

    // Find if problem already exists in progress
    const existingProgress = user.progress.find(p => p.problemId === problemId);

    if (existingProgress) {
      // Update existing progress
      if (completed !== undefined) {
        existingProgress.completed = completed;
        existingProgress.completedAt = completed ? new Date() : null;
      }
      if (bookmarked !== undefined) existingProgress.bookmarked = bookmarked;
      if (notes !== undefined) existingProgress.notes = notes;
    } else {
      // Add new progress entry
      user.progress.push({
        problemId,
        completed: completed || false,
        bookmarked: bookmarked || false,
        notes: notes || '',
        completedAt: completed ? new Date() : null,
      });
    }

    await user.save();
    res.json(user.progress);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/progress/:problemId
// @desc    Delete problem progress
// @access  Private
router.delete('/:problemId', protect, async (req, res) => {
  try {
    const { problemId } = req.params;

    const user = await User.findById(req.user._id);
    user.progress = user.progress.filter(p => p.problemId !== problemId);

    await user.save();
    res.json(user.progress);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/progress/stats
// @desc    Get user's statistics
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('progress');
    
    const total = user.progress.length;
    const completed = user.progress.filter(p => p.completed).length;
    const bookmarked = user.progress.filter(p => p.bookmarked).length;

    res.json({
      total,
      completed,
      bookmarked,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
