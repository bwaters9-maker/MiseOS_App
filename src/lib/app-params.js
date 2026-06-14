/**
 * src/lib/app-params.js
 * Global parameters configuration for white-labeling and brand adaptation.
 */
export const APP_PARAMS = {
  systemName: "MiseOS",
  defaultBrand: {
    name: "MiseOS Operations",
    tagline: "Back-of-House Kitchen Coordination System",
    location: "Global Pass",
    logoAlt: "MiseOS Core"
  },
  getBrandConfig: () => {
    const localBrand = localStorage.getItem('miseos_brand_config');
    if (localBrand) {
      try {
        return JSON.parse(localBrand);
      } catch (e) {
        console.error("Error parsing tenant brand configuration:", e);
      }
    }
    return APP_PARAMS.defaultBrand;
  }
};
