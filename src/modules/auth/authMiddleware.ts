import { Request, Response, NextFunction } from 'express';

// Mock user database for demonstration/testing purposes
const MOCK_USERS: Record<string, { id: string; role: string }> = {
  'user-chef-1': { id: 'user-chef-1', role: 'Chef' },
  'user-owner-1': { id: 'user-owner-1', role: 'Owner' },
  'user-linecook-1': { id: 'user-linecook-1', role: 'Line Cook' },
};

export const authorizeRoles = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({ error: 'Access Denied: No x-user-id header provided' });
    }

    const user = MOCK_USERS[userId];

    if (!user) {
      return res.status(401).json({ error: 'Access Denied: Invalid user' });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Access Denied: Insufficient permissions' });
    }

    next();
  };
};
