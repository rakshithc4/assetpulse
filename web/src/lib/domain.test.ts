import { describe, it, expect } from 'vitest';
import { canReportRequest, canActOnRequest, canActOnOrder } from './domain';

describe('canReportRequest', () => {
  it.each([
    ['engineer', true],
    ['supervisor', true],
    ['technician', false],
  ] as const)('%s -> %s', (role, expected) => {
    expect(canReportRequest(role)).toBe(expected);
  });
});

describe('canActOnRequest', () => {
  it.each([
    ['engineer', 'convert_request', 'REPORTED', false],
    ['engineer', 'reject_request', 'REPORTED', false],
    ['technician', 'convert_request', 'REPORTED', false],
    ['technician', 'reject_request', 'REPORTED', false],
    ['supervisor', 'convert_request', 'REPORTED', true],
    ['supervisor', 'reject_request', 'REPORTED', true],
    ['supervisor', 'convert_request', 'CONVERTED', false],
    ['supervisor', 'reject_request', 'REJECTED', false],
  ] as const)('%s / %s / %s -> %s', (role, action, status, expected) => {
    expect(canActOnRequest(role, action, { status })).toBe(expected);
  });
});

describe('canActOnOrder', () => {
  it.each([
    // schedule_order — supervisor only, CREATED only
    ['supervisor', 'schedule_order', 'CREATED', null, 'tech@demo', true],
    ['supervisor', 'schedule_order', 'SCHEDULED', null, 'tech@demo', false],
    ['technician', 'schedule_order', 'CREATED', 'tech@demo', 'tech@demo', false],
    ['engineer', 'schedule_order', 'CREATED', null, 'tech@demo', false],

    // start_work — supervisor any assignee; technician only if assigned to self; status must be SCHEDULED
    ['supervisor', 'start_work', 'SCHEDULED', 'tech@demo', 'tech@demo', true],
    ['technician', 'start_work', 'SCHEDULED', 'tech@demo', 'tech@demo', true],
    ['technician', 'start_work', 'SCHEDULED', 'other@demo', 'tech@demo', false],
    ['technician', 'start_work', 'CREATED', 'tech@demo', 'tech@demo', false],
    ['engineer', 'start_work', 'SCHEDULED', 'tech@demo', 'tech@demo', false],

    // complete_work — same shape as start_work, status must be IN_PROGRESS
    ['supervisor', 'complete_work', 'IN_PROGRESS', 'tech@demo', 'tech@demo', true],
    ['technician', 'complete_work', 'IN_PROGRESS', 'tech@demo', 'tech@demo', true],
    ['technician', 'complete_work', 'IN_PROGRESS', 'other@demo', 'tech@demo', false],
    ['technician', 'complete_work', 'SCHEDULED', 'tech@demo', 'tech@demo', false],

    // cancel_order — supervisor only, CREATED or SCHEDULED
    ['supervisor', 'cancel_order', 'CREATED', null, 'tech@demo', true],
    ['supervisor', 'cancel_order', 'SCHEDULED', 'tech@demo', 'tech@demo', true],
    ['supervisor', 'cancel_order', 'IN_PROGRESS', 'tech@demo', 'tech@demo', false],
    ['technician', 'cancel_order', 'CREATED', 'tech@demo', 'tech@demo', false],
  ] as const)('%s / %s / status=%s assignedTo=%s current=%s -> %s', (role, action, status, assignedTo, currentUser, expected) => {
    expect(canActOnOrder(role, action, { status, assignedTo }, currentUser)).toBe(expected);
  });
});
