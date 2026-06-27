import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

// Initialize Firebase Admin SDK if not already initialized.
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

/**
 * Middleware to verify an active workspace session.
 *
 * This is the "time-lock" on the kitchen's main office. Even if a chef has the
 * master key (a valid auth token), this check ensures their specific work
 * session is still active. It reads the `admin_session.expiresAt` timestamp
 * from the user's document.
 *
 * This prevents background agents with expired sessions from hitting endpoints
 * in a loop, as it provides a clear "session expired" signal to re-authenticate.
 */
export const verifyWorkspaceSession = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No authentication token provided.' });
  }

  const idToken = authorization.split('Bearer ')[1];

  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      return res.status(403).json({ error: 'Forbidden: User profile not found.' });
    }

    const userData = userDoc.data();
    const adminSession = userData?.admin_session;

    if (!adminSession || !adminSession.expiresAt || adminSession.expiresAt.toDate() < new Date()) {
      return res.status(401).json({ error: 'Unauthorized: Workspace session has expired. Please re-authenticate.' });
    }

    req.user = { uid: decodedToken.uid, role: userData?.role };
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid authentication token.' });
  }
};