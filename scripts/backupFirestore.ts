/**
 * scripts/backupFirestore.ts
 * Exports the entire Firestore database to Cloud Storage via the
 * Firestore Admin REST API's exportDocuments operation (no gcloud CLI
 * required — uses the same service account credentials as the other
 * admin scripts). Polls until the export actually completes before
 * reporting success.
 *
 * Usage:
 *   npx tsx scripts/backupFirestore.ts
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS pointing at a service account
 * key JSON.
 */
import 'dotenv/config';
import { GoogleAuth } from 'google-auth-library';

const PROJECT_ID = 'miseos-app';
const BUCKET = 'miseos-app.firebasestorage.app';

async function main() {
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/datastore'] });
  const client = await auth.getClient();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputUriPrefix = `gs://${BUCKET}/firestore-backups/pre-cleanup-${timestamp}`;

  console.log(`Starting export to ${outputUriPrefix} ...`);

  const startRes = await client.request<{ name: string }>({
    url: `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default):exportDocuments`,
    method: 'POST',
    data: { outputUriPrefix, collectionIds: [] }, // empty = export every collection
  });

  const operationName = startRes.data.name;
  console.log(`Export operation started: ${operationName}`);
  console.log('Polling until complete...');

  const start = Date.now();
  const timeoutMs = 10 * 60 * 1000; // 10 minutes

  while (true) {
    await new Promise((r) => setTimeout(r, 5000));
    const pollRes = await client.request<{ done?: boolean; metadata?: any; error?: any }>({
      url: `https://firestore.googleapis.com/v1/${operationName}`,
      method: 'GET',
    });
    const { done, metadata, error } = pollRes.data;
    const progress = metadata?.progressDocuments;
    console.log(
      `  ...${progress ? ` ${progress.completedWork ?? 0}/${progress.estimatedWork ?? '?'} docs` : ' waiting'} (${Math.round((Date.now() - start) / 1000)}s elapsed)`
    );

    if (error) {
      console.error('Export FAILED:', JSON.stringify(error, null, 2));
      process.exit(1);
    }
    if (done) {
      console.log(`\nExport COMPLETE: ${outputUriPrefix}`);
      console.log('Verify in the console: https://console.firebase.google.com/project/miseos-app/firestore/databases/-default-/backups');
      console.log(`Or in Cloud Storage: https://console.cloud.google.com/storage/browser/${BUCKET}/firestore-backups`);
      return;
    }
    if (Date.now() - start > timeoutMs) {
      console.error('Export timed out after 10 minutes without completing.');
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error('Backup failed:', err?.response?.data ?? err);
  process.exit(1);
});
