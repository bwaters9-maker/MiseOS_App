import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import type { Request, Response, NextFunction } from 'express';

// Initialize Firebase Admin SDK if not already initialized.
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

// Augment the Express Request type to include a user property.
interface AuthenticatedRequest extends Request {
    user?: {
        uid: string;
        role: string;
    }
}

/**
 * Middleware to verify user permissions before allowing access to recipe modification endpoints.
 *
 * This is our kitchen's "Maître d'". Before a chef can enter the kitchen to
 * create or change a recipe ('The Remix' or 'The Refine'), the Maître d' checks
 * their credentials. Only the Executive Chef ('Admin') or a Sous-Chef ('Sous')
 * are allowed through, as defined in our house rules (`firestore.rules`).
 */
export const canEditRecipes = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<Response | void> => {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No authentication token provided.' });
  }

  const idToken = authorization.split('Bearer ')[1];

  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();

    if (!userDoc.exists || (userDoc.data()?.role !== 'Admin' && userDoc.data()?.role !== 'Sous')) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions.' });
    }

    req.user = { uid: decodedToken.uid, role: userDoc.data()?.role };
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid authentication token.' });
  }
};