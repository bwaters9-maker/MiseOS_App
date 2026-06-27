/**
 * This file represents the data contracts defined in Firestore_Schema.txt.
 * It provides a clear blueprint for data structures used throughout the application,
 * ensuring consistency and adherence to our "Prep-Heavy, Service-Light" philosophy.
 */

export const userSchema = {
  name: "",
  role: "",
  permissions: "Line", // Admin, Sous, Line
  subscription_status: "trialing",
  trial_end_date: null, // timestamp
  admin_session: { expiresAt: null },
  location_context: "",
  user_settings: {
    ui_toggles: {
      calendar_forecasting: false,
      weather_tracking: false,
      revenue_analytics: false,
    },
  },
  availability: {},
};

export const ingredientSchema = {
  name: "",
  vendor_id: "", // reference
  cost_per_unit: 0.0,
  quantity: 0,
  createdAt: null, // server timestamp
  category: "",
  price_source: "regional_estimate", // 'regional_estimate' or 'invoice_scan'
  culinary_trend: "",
  price_trend: "",
  nutrition_info: {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  },
  allergens: [],
  source_authority: "",
  price_alert: {
    is_volatile: false,
    reason: "",
    expected_duration: "",
  },
};

export const recipeSchema = {
  title: "",
  yield: 0,
  margin_goal: 0,
  station: "",
  // Note: 'recipeComponents' is a sub-collection and not part of the main document.
};

export const menuItemSchema = {
  name: "",
  recipe_id: "", // reference
  status: "",
  price: 0.0,
};

export const vendorSchema = {
  company_name: "",
  contact_info: "",
  lead_time: 0,
};