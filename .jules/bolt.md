## 2025-05-15 - [Avoid ReferenceError with displayName]
**Learning:** Assigning `displayName` to a component defined with `const` inside its own function body causes a `ReferenceError` because the variable is accessed before its declaration is complete.
**Action:** Always assign `displayName` outside of the component definition.

## 2025-05-15 - [Redundant React.memo on Prop-less Components]
**Learning:** Applying `React.memo` to components that take no props (or only manage internal state) provides no performance benefit and adds unnecessary comparison overhead.
**Action:** Skip `React.memo` for components without props unless they are expensive to render and their parent re-renders frequently without changing context.
