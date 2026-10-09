import { describe, it, expect } from 'vitest';
import { BLANK, toForm, toDoc, canSavePrepItemForm, type FormState } from './PrepItemForm';
import type { PrepItem } from '../../types';

// The form's pure helpers only — FormState in, doc fields / save verdict
// out. No render; the component itself is exercised on screen (P-038's
// STOP-AND-VERIFY), these pin the contract it saves through.

const filled: FormState = {
  ...BLANK,
  name: 'Tenderloin',
  assignedStation: 'Grill',
  unit: 'kg',
  par: '1',
  onHand: '1',
};

describe('canSavePrepItemForm (P-038)', () => {
  it('still requires hands-on > 0 when no-estimate is unchecked', () => {
    expect(canSavePrepItemForm(filled, false)).toBe(false);
    expect(canSavePrepItemForm({ ...filled, activeMinutes: '0' }, false)).toBe(false);
    expect(canSavePrepItemForm({ ...filled, activeMinutes: '45' }, false)).toBe(true);
  });

  it('enables Save with no times at all once no-estimate is checked — the state is now producible', () => {
    expect(canSavePrepItemForm({ ...filled, noEstimate: true }, false)).toBe(true);
    expect(canSavePrepItemForm({ ...filled, noEstimate: true }, true)).toBe(true);
  });

  it('no-estimate lifts the time rule only — par and onHand still apply', () => {
    expect(canSavePrepItemForm({ ...filled, noEstimate: true, par: '0' }, false)).toBe(false);
    expect(canSavePrepItemForm({ ...filled, noEstimate: true, onHand: '' }, false)).toBe(false);
    expect(canSavePrepItemForm({ ...filled, noEstimate: true, name: ' ' }, false)).toBe(false);
  });
});

describe('toDoc (P-038)', () => {
  it('writes noEstimate: true and NEITHER time key for a no-estimate save — never activeMinutes: 0', () => {
    const d = toDoc({ ...filled, noEstimate: true });
    expect(d.noEstimate).toBe(true);
    expect(d).not.toHaveProperty('activeMinutes');
    expect(d).not.toHaveProperty('inactiveMinutes');
  });

  it('writes noEstimate: false explicitly on an ordinary save, so unchecking it on edit clears it under partial merge', () => {
    const d = toDoc({ ...filled, activeMinutes: '45' });
    expect(d.noEstimate).toBe(false);
    expect(d.activeMinutes).toBe(45);
    expect(d.inactiveMinutes).toBe(0);
  });

  it('ignores a number left in a time field when the flag is set — the flag wins at write time too', () => {
    const d = toDoc({ ...filled, noEstimate: true, activeMinutes: '45', inactiveMinutes: '60' });
    expect(d).not.toHaveProperty('activeMinutes');
    expect(d).not.toHaveProperty('inactiveMinutes');
  });
});

describe('toForm (P-038)', () => {
  const base: PrepItem = { id: '1', name: 'Tenderloin', assignedStation: 'Grill', unit: 'kg', par: 1, onHand: 1, checked: false };

  it('round-trips a stored no-estimate item back to a checked box with empty inputs', () => {
    const f = toForm({ ...base, noEstimate: true });
    expect(f.noEstimate).toBe(true);
    expect(f.activeMinutes).toBe('');
    expect(f.inactiveMinutes).toBe('');
  });

  it('keeps a stale number out of the inputs when the flag is set', () => {
    const f = toForm({ ...base, noEstimate: true, activeMinutes: 45 });
    expect(f.activeMinutes).toBe('');
  });

  it('reads a pre-P-038 doc (no flag) as unchecked with its times intact', () => {
    const f = toForm({ ...base, activeMinutes: 45, inactiveMinutes: 60 });
    expect(f.noEstimate).toBe(false);
    expect(f.activeMinutes).toBe('45');
    expect(f.inactiveMinutes).toBe('60');
  });
});
