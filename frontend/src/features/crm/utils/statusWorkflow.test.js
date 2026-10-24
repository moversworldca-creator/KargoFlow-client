import { describe, expect, it } from 'vitest';
import { canTransition, getRecordSystemState, getRecordWorkflowActions, LEAD_STATUS_CODES, OPPORTUNITY_STATUS_CODES } from './statusWorkflow';

const actions = (system_state, isLead = false, hasPermission = () => true) =>
  getRecordWorkflowActions({ id: 1, system_state, workflow_stage: 'confirmed' }, { isLead, hasPermission }).map((row) => row.key);

describe('canonical sales lifecycle', () => {
  it('keeps custom and legacy stages out of system status options', () => {
    expect(LEAD_STATUS_CODES).toContain('in_progress');
    expect(LEAD_STATUS_CODES).not.toContain('contacted');
    expect(OPPORTUNITY_STATUS_CODES).toEqual(['open', 'booked', 'lost', 'cancelled', 'completed', 'closed']);
  });
  it('uses system state before legacy stage or status', () => {
    expect(getRecordSystemState({ system_state: 'lost', status: 'active', workflow_stage: 'confirmed' })).toBe('lost');
  });
  it('does not permit direct lead conversion or restore without an intermediate state', () => {
    expect(canTransition(true, 'new', 'converted')).toBe(false);
    expect(canTransition(true, 'qualified', 'converted')).toBe(true);
    expect(canTransition(true, 'archived', 'in_progress')).toBe(true);
    expect(canTransition(true, 'converted', 'in_progress')).toBe(false);
    expect(actions('new', true)).toEqual(['start', 'qualify', 'lost', 'disqualify', 'archive']);
    expect(actions('converted', true)).toEqual([]);
    expect(actions('disqualified', true)).toEqual(['restore']);
  });
  it('offers opportunity actions only from the correct states', () => {
    expect(actions('open')).toEqual(['book', 'lost']);
    expect(actions('booked')).toEqual(['unbook', 'cancel', 'complete']);
    expect(actions('lost')).toEqual(['reopen']);
    expect(actions('cancelled')).toEqual(['reopen']);
    expect(actions('completed')).toEqual([]);
    expect(actions('closed')).toEqual([]);
    expect(canTransition(false, 'booked', 'lost')).toBe(false);
    expect(canTransition(false, 'completed', 'open')).toBe(false);
  });
  it('checks the permission for each action', () => {
    expect(actions('new', true, (permission) => permission === 'leads.qualify')).toEqual(['qualify']);
    expect(actions('booked', false, (permission) => permission === 'opportunities.complete')).toEqual(['complete']);
    expect(actions('archived', true, () => false)).toEqual([]);
  });
});
