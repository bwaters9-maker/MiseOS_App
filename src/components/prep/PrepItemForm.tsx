/**
 * src/components/prep/PrepItemForm.tsx
 * One shared add/edit form for a prep catalog item — same controlled-form
 * pattern as components/ingredients/IngredientForm.tsx (form/setForm/onSave/
 * onCancel/saving props, a FormState + BLANK/toForm/toDoc trio, a canSave
 * predicate). Built on the brand kit from the start (formStyles.ts), not
 * the legacy dark-zinc style IngredientForm.tsx itself still carries.
 *
 * Covers only the catalog fields (name, station, spec, unit, par, onHand,
 * prepMinutes) — never checked/notNeeded/printedDate. toDoc's output is a
 * partial field set by design: spread onto fresh-item defaults on add, or
 * passed straight to updateDoc on edit, where Firestore's partial-merge
 * semantics leave today's shift state (checked/notNeeded/printedDate)
 * untouched by a catalog edit. That's deliberate, not an oversight — a
 * chef fixing a par level must never silently un-check a cook's finished
 * prep.
 */
import React from 'react';
import { INPUT, INPUT_NUMERIC, FIELD_LABEL, BTN_ACTION, BTN_GHOST } from '../../lib/formStyles';
import { onHandValue } from '../../lib/prepEngine';
import type { PrepItem } from '../../types';

/**
 * Deliberately separate from src/lib/units.ts's DisplayUnit set and NOT to
 * be unified with it later. units.ts is cost-basis conversion — a 9-value
 * list gated on measureType and imperial/metric, feeding toBase/fromBase
 * for the Recipe/Ingredient costing pipeline. Prep quantities are never
 * costed or converted (PrepItem has no measureType at all), so pulling a
 * prep unit through that system would mean either bolting a fake measure
 * type onto a checklist or dragging live conversion into a screen that has
 * no use for it. If a future pass wants one shared unit vocabulary, that's
 * a deliberate redesign of both call sites, not a "just import the other
 * one" fix.
 */
export const PREP_UNIT_GROUPS: { label: string; units: string[] }[] = [
  { label: 'Weight', units: ['oz', 'lb', 'g', 'kg'] },
  { label: 'Volume', units: ['cup', 'pt', 'qt', 'gal', 'fl oz', 'mL', 'L'] },
  { label: 'Count', units: ['each', 'dozen', 'case', 'batch', 'portion', 'bag'] },
];
export const PREP_UNITS: string[] = PREP_UNIT_GROUPS.flatMap(g => g.units);

export interface FormState {
  name: string;
  assignedStation: string;
  spec: string;
  unit: string;
  par: string;
  onHand: string;
  prepMinutes: string;
}

export const BLANK: FormState = {
  name: '',
  assignedStation: '',
  spec: '',
  unit: '',
  par: '',
  onHand: '',
  prepMinutes: '',
};

export const toForm = (item: PrepItem): FormState => ({
  name: item.name,
  assignedStation: item.assignedStation,
  spec: item.spec ?? '',
  unit: item.unit,
  par: String(item.par),
  onHand: String(onHandValue(item)),
  prepMinutes: item.prepMinutes != null ? String(item.prepMinutes) : '',
});

/** The seven catalog fields this form owns, nothing else. See the file
 * header for why prepMinutes is included only when the field parses —
 * an edit session that leaves it blank must leave a stored value alone,
 * not zero it out. */
export type PrepItemCatalogFields = Pick<PrepItem, 'name' | 'assignedStation' | 'unit' | 'par' | 'onHand' | 'spec' | 'prepMinutes'>;

export const toDoc = (f: FormState): PrepItemCatalogFields => {
  const prepMinutes = parseFloat(f.prepMinutes);
  return {
    name: f.name.trim(),
    assignedStation: f.assignedStation,
    unit: f.unit,
    par: parseFloat(f.par) || 0,
    onHand: parseFloat(f.onHand) || 0,
    ...(f.spec.trim() && { spec: f.spec.trim() }),
    ...(f.prepMinutes !== '' && !isNaN(prepMinutes) && { prepMinutes }),
  };
};

/**
 * par and onHand must be positive, matching what the form this replaces
 * already required. prepMinutes is required on every save, add or edit —
 * the sort is execution-critical (a missing estimate sinks an item to the
 * bottom of the printed sheet, so a 3-hour braise could print below a
 * 10-minute garnish) and the chef is already in the form, so this is the
 * point a legacy item without one gets converted, opportunistically and
 * without a migration.
 */
export const canSavePrepItemForm = (f: FormState, isEditing: boolean): boolean =>
  f.name.trim() !== ''
  && f.assignedStation !== ''
  && f.unit !== ''
  && parseFloat(f.par) > 0
  && parseFloat(f.onHand) > 0
  && parseFloat(f.prepMinutes) > 0;

/** Presets plus the form's current value if it isn't one — an item whose
 * stored station/unit was since renamed or removed must still show and
 * keep its actual value rather than silently jumping to something else. */
const withCurrentValue = (options: string[], current: string): string[] =>
  current && !options.includes(current) ? [...options, current] : options;

export const PrepItemForm: React.FC<{
  form: FormState;
  setForm: (f: FormState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  stationPresets: string[];
  isEditing: boolean;
}> = ({ form, setForm, onSave, onCancel, saving, stationPresets, isEditing }) => {
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm({ ...form, [k]: v });

  const stationOptions = withCurrentValue(stationPresets, form.assignedStation);
  const canSave = canSavePrepItemForm(form, isEditing);

  return (
    <div className="space-y-[13px] bg-surface border border-line rounded-card p-[21px]">
      <div>
        <label className={FIELD_LABEL}>Item Name</label>
        <input
          type="text"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="e.g. Carrots"
          className={INPUT}
          autoFocus
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[13px]">
        <div>
          <label className={FIELD_LABEL}>Station</label>
          <select
            value={form.assignedStation}
            onChange={e => set('assignedStation', e.target.value)}
            className={INPUT}
          >
            <option value="">— Select station —</option>
            {stationOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={FIELD_LABEL}>Unit</label>
          <select
            value={form.unit}
            onChange={e => set('unit', e.target.value)}
            className={INPUT}
          >
            <option value="">— Select unit —</option>
            {!form.unit || PREP_UNITS.includes(form.unit) ? null : (
              <option value={form.unit}>{form.unit}</option>
            )}
            {PREP_UNIT_GROUPS.map(g => (
              <optgroup key={g.label} label={g.label}>
                {g.units.map(u => <option key={u} value={u}>{u}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={FIELD_LABEL}>Prep Spec — Optional</label>
        <input
          type="text"
          value={form.spec}
          onChange={e => set('spec', e.target.value)}
          placeholder="e.g. oblique cut, blanched, shocked"
          className={INPUT}
        />
      </div>

      <div className="grid grid-cols-3 gap-[13px]">
        <div>
          <label className={FIELD_LABEL}>Par</label>
          <input
            type="number"
            value={form.par}
            onChange={e => set('par', e.target.value)}
            placeholder="0"
            min="0"
            step="any"
            className={INPUT_NUMERIC}
          />
        </div>
        <div>
          <label className={FIELD_LABEL}>On Hand</label>
          <input
            type="number"
            value={form.onHand}
            onChange={e => set('onHand', e.target.value)}
            placeholder="0"
            min="0"
            step="any"
            className={INPUT_NUMERIC}
          />
        </div>
        <div>
          <label className={FIELD_LABEL}>Prep Minutes</label>
          <input
            type="number"
            value={form.prepMinutes}
            onChange={e => set('prepMinutes', e.target.value)}
            placeholder="0"
            min="0"
            step="1"
            className={INPUT_NUMERIC}
          />
        </div>
      </div>

      <div className="flex gap-[8px] justify-end pt-[5px]">
        <button type="button" onClick={onCancel} className={BTN_GHOST}>Cancel</button>
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave || saving}
          className={`${BTN_ACTION} disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
};
