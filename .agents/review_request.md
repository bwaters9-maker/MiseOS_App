# Code Review Request: Remove Financial Smoke Detector Module

## Summary
The goal of this task was to completely remove the `financialSmokeDetector` module from the codebase while ensuring that the `inventoryLedger` logic remains intact and functional.

## Changes
- Deleted `src/modules/financials/financialSmokeDetector.js`.
- Removed redundant files: `src/modules/financials/financialSmokeDetector.test.js` and `src/modules/financials/financialsRoutes.ts`.
- Created `src/modules/financials/index.js` to serve as the new entry point for the financials module, which now only exports `inventoryLedger` (redirected from inventory).
- Updated `server.ts` to:
  - Export the `app` instance for testing.
  - Remove the direct import of `financialSmokeDetector`.
  - Import the new `financials` entry point.
  - Guard the `startServer()` call with a `process.env.NODE_ENV !== "test"` check to prevent Vite from starting during tests.
- Scrubbed `src/modules/financials/financialsSuite.test.js` of all `detect-leak` and `smokeDetectorAlarm` references.
- Verified that both `financialsSuite.test.js` and `inventoryLedger.test.js` pass with zero errors.

## Verification Results
- All relevant tests pass.
- Codebase is cleaned of the deleted module.
