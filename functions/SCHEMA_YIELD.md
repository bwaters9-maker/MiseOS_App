# Schema Definition: Yield & True Cost Metrics

This document outlines the data contract for enhanced costing metrics within the `ingredients` collection. The purpose of these fields is to enable the calculation of a "true cost per unit" by accounting for fabrication waste and unit conversions, moving beyond simple invoice pricing.

This implements the "Butcher's Yield Test" philosophy: the cost of a steak is not the cost of the whole primal cut, but the cost of the primal cut divided by the weight of the steaks you can actually get from it.

---

### Collection: `ingredients`

The following fields are proposed additions to an `ingredient` document to facilitate executive costing.

#### `purchase_cost` (number)

*   **Description**: The total cost paid for a bulk inventory item as per the vendor invoice (e.g., the price for a whole case of fish, a 50lb bag of flour).
*   **Rule**: Must be a non-negative number.
*   **Example**: `120.50` (for a case of fish)

#### `conversion_multiplier` (number)

*   **Description**: The factor used to convert the purchased unit into the standard inventory unit. This is for calculating cost on a consistent basis.
*   **Rule**: Must be a positive number. A value of `1` indicates the purchase unit is the same as the inventory unit.
*   **Example**: If a "case" of herbs weighs 2 pounds and the inventory unit is "pounds," the multiplier is `2`.

#### `usable_yield_percentage` (number)

*   **Description**: The percentage of the raw material that remains after all fabrication (trimming, deboning, peeling, etc.). This is the most critical factor for determining true cost.
*   **Rule**: Must be a number between 0 (exclusive) and 100 (inclusive).
*   **Example**: A whole fish might have a `usable_yield_percentage` of `55` after it has been filleted and skinned.

---

By enforcing these fields, the system can dynamically calculate a `true_cost_per_unit` that reflects the financial reality of the kitchen, ensuring all menu items are priced for profitability.