# Schema Definition: Recipe Production Scaling

This document outlines the data contract and validation rules for scaling a recipe for bulk production. The purpose is to create a standardized, auditable process for generating large prep lists, ensuring linear scaling of ingredients and preventing unauthorized inventory draws.

This implements the "Banquet Prep" philosophy: when a recipe for 4 is needed for 200, the system must produce a precise prep list for 50x the ingredients, and only an executive can authorize it.

---

### Endpoint: `POST /scale-production`

This endpoint is responsible for taking a base recipe and a multiplier and returning a scaled component list.

#### Authorization

*   **Rule**: Access to this endpoint **MUST** be restricted by role-based authorization gates.
*   **Requirement**: Only users with an executive role ('Admin' or 'Sous') can successfully call this endpoint. Non-executive requests **MUST** be rejected with a `403 Forbidden` status.

#### Request Body Validation

*   `recipeId` (string): A valid ID of a document in the `recipes` collection.
*   `multiplier` (number): The factor by which to scale the recipe.
    *   **Rule**: Must be a positive number greater than 1.

#### Core Logic: Linear Mapping

1.  The system will fetch the specified `recipe` document and all documents from its `recipeComponents` subcollection.
2.  For each component, the `quantity` field will be multiplied by the `multiplier` from the request.
3.  The system will return a new, temporary list of components with their calculated scaled quantities. This list is for generating a prep sheet and is not intended to be saved as a new recipe.

This ensures that a 2x scaling of a recipe results in exactly 2x the quantity for every single ingredient, with no exceptions.