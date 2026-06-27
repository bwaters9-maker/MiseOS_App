/**
 * @fileoverview This script acts as a pre-deployment safeguard.
 * It's the "Head Chef's Final Sign-Off" before service begins.
 *
 * It verifies that a workspace owner has been explicitly selected in the
 * environment configuration. If no owner is set, it halts the process to
 * prevent accidental or unauthorized deployments.
 */

const ownerId = process.env.MISEOS_WORKSPACE_OWNER_ID;

const isDevelopment = process.env.NODE_ENV === 'development';

if (!ownerId && !isDevelopment) {
  console.error('\x1b[31m%s\x1b[0m', 'HALT: Deployment process stopped.');
  console.error('Reason: No workspace owner ID has been selected for this production deployment.');
  console.error('Please set the MISEOS_WORKSPACE_OWNER_ID environment variable to the executive user\'s UID to authorize this deployment.');
  process.exit(1);
}

if (!ownerId && isDevelopment) {
  console.warn('\x1b[33m%s\x1b[0m', 'WARNING: Bypassing workspace owner check in development mode.');
  console.log('\x1b[32m%s\x1b[0m', 'Workspace Configuration Check: PASSED (Development Mode).');
} else if (ownerId) {
  console.log('\x1b[32m%s\x1b[0m', `Workspace Configuration Check: PASSED. Deploying on behalf of ${ownerId}.`);
}