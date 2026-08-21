/**
 * src/lib/sousAppKnowledge.ts
 * Chef-facing description of IncendiumPhi and each shipped module, injected
 * into Sous's system prompt so he can accurately explain the app and point
 * chefs to the right tab. Sous must never freehand app facts in the prompt
 * string itself — anything he says about the app comes from here.
 *
 * MUST be updated whenever a module ships, a nav tab is renamed, or a
 * feature moves. If this file drifts from the real app, Sous will describe
 * features that don't exist or miss ones that do — that's exactly the
 * confabulation problem this file exists to prevent.
 */

interface AppModule {
  name: string;
  description: string;
}

const APP_MODULES: AppModule[] = [
  {
    name: 'Dashboard',
    description: "Today's command center — station coverage for today's shifts, today's events, tonight's active features, a one-line trends strip (what's in season now plus the current viral-bridge trend), an In Development list of unfinished dishes with their cost per portion and food-cost %, and quick actions (Crib Sheet, Add Feature). A read-only snapshot; Add Feature is the one write it does.",
  },
  {
    name: 'Staff',
    description: 'Employee directory and shift scheduling, with a week/month calendar merged with Events and a per-employee weekly-hours strip with an overtime flag. No time clock, no shift swaps, no availability requests — deliberately out of scope.',
  },
  {
    name: 'Events & Clients',
    description: 'Catering and event management — client profiles with contact info and flag notes, event detail pages with a day-of milestone timeline, a tentative menu that can link real recipes for cost projection, and an append-only change log per event.',
  },
  {
    name: 'Recipes',
    description: 'Recipe Builder (menu recipes and sub-recipes with live cost, food-cost %, suggested pricing, and an FDA nutrition label), Menu (the operational cost/FC% view plus a guest-facing preview with Classic/Clean print templates), Recipe Collections (seasonal groupings of menu recipes, one active at a time), and Development — the dish-development workspace (formerly its own Test Kitchen tab): an AI-generated, read-only editorial trend briefing with pricing commentary and a seasonal sourcing matrix (never touches the pantry or costing), the Sous chat for brainstorming new dishes, and a Recipe Build panel that turns a chat into a real recipe. A menu recipe is either in development or active: development dishes carry up to three variants with notes, and stay off the Menu, out of Collections, and out of the Guest Preview until the chef sets them active.',
  },
  {
    name: 'Prep List',
    description: "Par-level deficit tracking — what's short against today's par levels and needs prepping.",
  },
  {
    name: 'Settings',
    description: "Restaurant Profile (name, cuisine style, price point, regional notes — this is what feeds Sous's restaurant context), plus Ingredients (the Master Pantry) and Vendors as sub-tabs, along with station presets, recipe categories, and the Day/Service surface toggle.",
  },
];

export const APP_KNOWLEDGE_CONTEXT = `About IncendiumPhi:
IncendiumPhi is a restaurant back-of-house management app — recipe costing, staff scheduling, events and catering, a live pantry, and an AI test kitchen, all in one place. It replaces the spreadsheets and sticky notes most kitchens run the back of house on.

Modules and where to find them:
${APP_MODULES.map(m => `- ${m.name}: ${m.description}`).join('\n')}`;
