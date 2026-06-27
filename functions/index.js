import { Router } from 'express';
import inventoryLedgerRoutes from './inventoryLedger.js';

/**
 * @fileoverview This file acts as the main switchboard for the "Finance Department."
 * It consolidates all routers related to inventory costs and financial analysis
 * into a single, unified namespace.
 */

const router = Router();

// Connect the various desks of the finance department to the main switchboard.
router.use(inventoryLedgerRoutes);

export default router;