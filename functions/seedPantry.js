import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK if not already initialized.
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

// Static, human-verified starter data for vendors.
const vendors = [
  { tempId: 'vendor_1', company_name: 'General Produce Co.', contact_info: 'sales@gpc.com', lead_time: 2 },
  { tempId: 'vendor_2', company_name: 'Coastal Meats & Seafood', contact_info: 'orders@coastal.net', lead_time: 3 },
  { tempId: 'vendor_3', company_name: 'Artisan Dairy Collective', contact_info: 'info@artisandairy.org', lead_time: 4 },
];

// Master ingredient definitions with explicit costs, ready for the pantry.
const ingredients = [
  { name: 'Spanish Onions', vendorTempId: 'vendor_1', cost_per_unit: 1.50, category: 'Produce', quantity: 100 },
  { name: 'Heirloom Tomatoes', vendorTempId: 'vendor_1', cost_per_unit: 4.25, category: 'Produce', quantity: 50 },
  { name: 'Prime Beef Tenderloin', vendorTempId: 'vendor_2', cost_per_unit: 22.50, category: 'Meat', quantity: 20 },
  { name: 'Wild Salmon Fillet', vendorTempId: 'vendor_2', cost_per_unit: 18.00, category: 'Seafood', quantity: 30 },
  { name: 'Heavy Cream', vendorTempId: 'vendor_3', cost_per_unit: 8.75, category: 'Dairy', quantity: 40 },
];

/**
 * This script performs a clean initialization of the pantry. It's like stocking
 * a brand new kitchen for the first time with a starter set of trusted ingredients
 * from verified suppliers.
 */
const seedPantry = async () => {
  console.log('Starting initial pantry stocking...');
  const batch = db.batch();
  const vendorRefs = {};

  // 1. Stage the vendors for creation and store their future references.
  console.log('Staging vendor records...');
  vendors.forEach(vendor => {
    const vendorRef = db.collection('vendors').doc();
    vendorRefs[vendor.tempId] = vendorRef;
    const { tempId, ...vendorData } = vendor;
    batch.set(vendorRef, vendorData);
  });

  // 2. Stage the ingredients, linking them to the staged vendor references.
  console.log('Staging master ingredient definitions...');
  ingredients.forEach(ingredient => {
    const ingredientRef = db.collection('ingredients').doc();
    const vendorRef = vendorRefs[ingredient.vendorTempId];

    if (!vendorRef) {
      console.error(`\x1b[31m%s\x1b[0m`, `Error: Could not find vendor for tempId: ${ingredient.vendorTempId}. Skipping ingredient.`);
      return;
    }

    const { vendorTempId, ...ingredientData } = ingredient;
    const payload = { ...ingredientData, vendor_id: vendorRef, createdAt: Timestamp.now(), price_source: 'regional_estimate' };
    batch.set(ingredientRef, payload);
  });

  // 3. Commit the entire pantry stock at once.
  try {
    await batch.commit();
    console.log('\x1b[32m%s\x1b[0m', '✅ Pantry Stocking Successful: All vendors and ingredients have been loaded.');
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', 'Pantry Stocking Failed:', error.message);
  }
};

seedPantry();