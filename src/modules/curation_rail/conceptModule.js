import express from 'express';
import { db } from '../../firebaseConfig.js';
import {
  collection,
  addDoc,
  doc,
  getDoc,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';

const router = express.Router();

/**
 * Middleware to enforce authentication and authorization.
 */
const authGuard = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const role = req.headers['x-role'];

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Missing x-user-id header' });
  }

  if (role !== 'Chef' && role !== 'Owner') {
    return res.status(403).json({ error: 'Access Denied: Insufficient permissions' });
  }

  req.userId = userId;
  req.role = role;
  next();
};

/**
 * POST /api/concepts/jot
 * Commits a raw text string to the conceptNotes collection.
 */
router.post('/jot', authGuard, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Raw text string is required' });
    }

    const docRef = await addDoc(collection(db, 'conceptNotes'), {
      text,
      userId: req.userId,
      role: req.role,
      status: 'raw',
      createdAt: serverTimestamp()
    });

    res.status(201).json({ success: true, id: docRef.id });
  } catch (error) {
    console.error('Error in /jot:', error);
    res.status(500).json({ error: 'Failed to commit concept note' });
  }
});

/**
 * POST /api/concepts/graduate
 * Freezes a scribble status and generates a matching development card in recipes.
 */
router.post('/graduate', authGuard, async (req, res) => {
  try {
    const { noteId } = req.body;
    if (!noteId) {
      return res.status(400).json({ error: 'noteId is required' });
    }

    const noteRef = doc(db, 'conceptNotes', noteId);
    const noteSnap = await getDoc(noteRef);

    if (!noteSnap.exists()) {
      return res.status(404).json({ error: 'Concept note not found' });
    }

    const noteData = noteSnap.data();
    if (noteData.status === 'graduated') {
      return res.status(400).json({ error: 'Concept note is already graduated' });
    }

    const batch = writeBatch(db);

    // 1. Freeze the scribble's status
    batch.update(noteRef, {
      status: 'graduated',
      graduatedAt: serverTimestamp()
    });

    // 2. Generate a matching development card in the recipes table
    const recipesCol = collection(db, 'recipes');
    const recipeRef = doc(recipesCol);
    batch.set(recipeRef, {
      name: noteData.text.split('\n')[0].substring(0, 50) || 'Untitled Graduated Concept',
      description: noteData.text,
      conceptNoteId: noteId,
      status: 'development',
      createdAt: serverTimestamp(),
      createdBy: req.userId,
      originalCovers: 4, // Default per architecture
      station: 'Garde Manger', // Default per architecture
      ingredients: [],
      steps: []
    });

    await batch.commit();

    res.status(200).json({
      success: true,
      message: 'Concept graduated to recipe development',
      recipeId: recipeRef.id
    });
  } catch (error) {
    console.error('Error in /graduate:', error);
    res.status(500).json({ error: 'Failed to graduate concept' });
  }
});

export default router;
