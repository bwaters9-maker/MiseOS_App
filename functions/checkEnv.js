/**
 * @fileoverview This script performs a simple environment check on boot.
 * It's the "morning kitchen check," ensuring the lights are on and the
 * equipment is ready before the prep team arrives.
 */

// Check for critical environment variables needed for core services.
const requiredEnvVars = ['GEMINI_API_KEY'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingVars.length > 0) {
  console.error('\x1b[31m%s\x1b[0m', 'HALT: Environment check failed.');
  console.error(`Reason: Missing critical environment variables: ${missingVars.join(', ')}`);
  console.error('Please ensure your environment is configured correctly before booting.');
  process.exit(1);
}

console.log('\x1b[32m%s\x1b[0m', '✅ Executive Workstation Connected: Environment check passed.');
console.log('All systems are nominal. Ready for service.');