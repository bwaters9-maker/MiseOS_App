import { Router } from 'express';
import { jotConcept } from './conceptController.js';
import { requirePermission } from '../../middleware/authInterceptor.js';

/**
 * @fileoverview API route definitions for the Curation Rail module.
 * This file acts as the "expo" line for creative ideas, directing them to the
 * correct station for processing.
 */

const router = Router();

/**
 * Route for "Jotting a Concept": Saving a raw culinary idea.
 * POST /jot
 * Body: { content: string, tags: Array<string> }
 */
router.post('/jot', requirePermission('concept_jot'), async (req, res) => {
  try {
    // The user's identity is attached to the request by the auth middleware.
    const userId = req.user.uid;
    const conceptData = req.body;

    const newConceptId = await jotConcept(conceptData, userId);
    res.status(201).json({ message: 'Concept jotted down successfully.', conceptId: newConceptId });
  } catch (error) {
    // Catches validation errors from Zod or other issues.
    res.status(400).json({ error: error.message });
  }
});

/**
 * Route for "Graduating a Concept": Promoting an idea to a draft recipe.
 *
 * SCOPE CREEP: This endpoint is a placeholder. The "Brain Dump Modules" feature
 * is currently LOCKED in the Master_Feature_Manifest.txt. The `graduateConcept`
 * controller logic has not been implemented.
 *
 * POST /graduate
 * Body: { conceptId: string }
 */
router.post('/graduate', requirePermission('concept_graduate'), async (req, res) => {
  try {
    // const { conceptId } = req.body;
    // await graduateConcept(conceptId); // This function does not exist yet.
    res.status(501).json({ error: 'Not Implemented: The concept graduation feature is pending approval and implementation.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;