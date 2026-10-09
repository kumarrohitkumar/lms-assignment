import { describe, expect, it } from 'vitest';
import { ageOn, evaluateBre, isValidPan, type BreInput } from '../../src/lib/bre';

const today = new Date('2026-10-09T00:00:00Z');
const valid: BreInput = {
  pan: 'ABCPE1234F',
  dateOfBirth: new Date('1995-05-20T00:00:00Z'),
  monthlySalary: 50_000_00,
  employmentMode: 'SALARIED',
};

describe('ageOn', () => {
  it('counts only completed years', () => {
    expect(ageOn(new Date('2003-10-09T00:00:00Z'), today)).toBe(23);
    expect(ageOn(new Date('2003-10-10T00:00:00Z'), today)).toBe(22);
  });
});

describe('isValidPan', () => {
  it.each(['ABCPE1234F', 'AAACB1234Z', 'XYZHK0000A'])('accepts %s', (pan) => {
    expect(isValidPan(pan)).toBe(true);
  });

  it.each([
    ['too short', 'ABCPE123F'],
    ['lowercase', 'abcpe1234f'],
    ['digit in letters block', 'AB1PE1234F'],
    ['invalid holder type (4th char)', 'ABCDE1234F'],
    ['letter in digits block', 'ABCPE12X4F'],
    ['digit at the end', 'ABCPE12345'],
    ['spaces', 'ABCPE 1234F'],
  ])('rejects %s', (_label, pan) => {
    expect(isValidPan(pan)).toBe(false);
  });
});

describe('evaluateBre', () => {
  it('passes a valid applicant', () => {
    expect(evaluateBre(valid, today)).toEqual({ passed: true, failures: [] });
  });

  it.each([
    ['22 years old', '2003-10-10', false],
    ['exactly 23', '2003-10-09', true],
    ['50 years old (day before 51st birthday)', '1975-10-10', true],
    ['51 years old', '1975-10-09', false],
  ])('age rule: %s', (_label, dob, passes) => {
    const result = evaluateBre({ ...valid, dateOfBirth: new Date(`${dob}T00:00:00Z`) }, today);
    expect(result.passed).toBe(passes);
    if (!passes) expect(result.failures.map((f) => f.rule)).toEqual(['AGE']);
  });

  it('salary rule: rejects below ₹25,000 and accepts exactly ₹25,000', () => {
    expect(evaluateBre({ ...valid, monthlySalary: 24_999_99 }, today).failures.map((f) => f.rule)).toEqual(['SALARY']);
    expect(evaluateBre({ ...valid, monthlySalary: 25_000_00 }, today).passed).toBe(true);
  });

  it('PAN rule: rejects invalid format', () => {
    expect(evaluateBre({ ...valid, pan: 'ABCDE1234F' }, today).failures.map((f) => f.rule)).toEqual(['PAN']);
  });

  it('employment rule: rejects unemployed, accepts self-employed', () => {
    expect(evaluateBre({ ...valid, employmentMode: 'UNEMPLOYED' }, today).failures.map((f) => f.rule)).toEqual([
      'EMPLOYMENT',
    ]);
    expect(evaluateBre({ ...valid, employmentMode: 'SELF_EMPLOYED' }, today).passed).toBe(true);
  });

  it('reports every failing rule with a readable message', () => {
    const result = evaluateBre(
      { pan: 'BAD', dateOfBirth: new Date('2010-01-01T00:00:00Z'), monthlySalary: 1_000_00, employmentMode: 'UNEMPLOYED' },
      today,
    );
    expect(result.passed).toBe(false);
    expect(result.failures.map((f) => f.rule)).toEqual(['AGE', 'SALARY', 'PAN', 'EMPLOYMENT']);
    result.failures.forEach((f) => expect(f.message.length).toBeGreaterThan(10));
  });
});
