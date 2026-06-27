# PERFORMANCE MANIFEST & OPTIMIZATION RULES

**FROM:** The Architect's Station
**STATUS:** Human-Verified for Operational Speed

This document certifies the performance optimization strategies applied across the MiseOS architecture. These rules are designed to preserve a high-speed, fluid user experience by eliminating unnecessary calculations and re-renders, ensuring the system feels as responsive as a seasoned kitchen brigade during peak service.

---

### Hook Memoization (`useMemo` & `useCallback`)

Our custom hooks are built with "chef's muscle memory" to prevent re-calculating data that hasn't changed.

*   **`useKitchenState`:**
    *   **Rule:** This hook, our "Head Chef's awareness," only re-computes its derived state (e.g., active timers, prep list progress) when its core dependencies from Firestore (recipes, tasks) actually change.
    *   **Analogy:** The Head Chef doesn't re-read the entire service plan every time a line cook chops a carrot. They only react when a new order comes in or a dish is 86'd. This prevents a cascade of updates for minor, irrelevant changes.

*   **`useStationPresets`:**
    *   **Rule:** Functions returned by this hook are wrapped in `useCallback`. This ensures that a line cook's personal station setup (their UI components) don't get needlessly re-rendered just because a parent component updated.
    *   **Analogy:** A Sauté cook arranges their station once. They don't tear down and rebuild their `mise en place` for every identical "Seared Scallops" ticket that comes in. The setup function remains stable unless the core menu changes.

---

### Component Memoization (`React.memo`)

Our core view components are wrapped in `React.memo` to act as a quality control check at the pass, preventing unnecessary re-renders.

*   **Core View Components (`DailyCribSheet`, `PrepChecklist`, etc.):**
    *   **Rule:** These components will only re-render if their direct props have changed.
    *   **Analogy:** If a perfectly garnished plate arrives at the pass, the expeditor doesn't send it back to be re-garnished just because another order came in. If the plate is correct and unchanged, it is sent. This prevents the entire user interface from re-drawing when only a small, isolated piece of data has been updated.

---

By strictly adhering to these memoization rules, we preserve the human-verified operational speed of the system, ensuring a smooth and efficient service, free from lag or wasted effort.