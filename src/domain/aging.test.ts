import { getDaysInStock, isAgingStock } from '@/domain/aging';

describe('isAgingStock', () => {
  it.each([
    [0, false],
    [90, false],
    [91, true],
    [200, true],
  ])('day %i → %s', (days, expected) => {
    expect(isAgingStock(days)).toBe(expected);
  });
});

describe('getDaysInStock', () => {
  it('counts the stocking date as day 0', () => {
    const stockedAt = '2026-06-10T03:00:00Z';
    expect(getDaysInStock(stockedAt, 'Europe/London', new Date('2026-06-10T20:00:00Z'))).toBe(0);
  });

  it('reaches day 90 and then day 91 on consecutive local dates', () => {
    const stockedAt = '2026-01-01T12:00:00Z';
    const day90 = getDaysInStock(stockedAt, 'Asia/Ho_Chi_Minh', new Date('2026-04-01T12:00:00Z'));
    const day91 = getDaysInStock(stockedAt, 'Asia/Ho_Chi_Minh', new Date('2026-04-02T12:00:00Z'));
    expect([day90, isAgingStock(day90)]).toEqual([90, false]);
    expect([day91, isAgingStock(day91)]).toEqual([91, true]);
  });

  it('rolls over at local midnight, not UTC midnight', () => {
    const stockedAt = '2026-06-10T03:00:00Z';
    // Ho Chi Minh City is UTC+7: 16:59 UTC is 23:59 on the 10th, 17:00 UTC is 00:00 on the 11th.
    expect(getDaysInStock(stockedAt, 'Asia/Ho_Chi_Minh', new Date('2026-06-10T16:59:00Z'))).toBe(0);
    expect(getDaysInStock(stockedAt, 'Asia/Ho_Chi_Minh', new Date('2026-06-10T17:00:00Z'))).toBe(1);
    // London is UTC+1 in June: 22:59 UTC is 23:59 on the 10th, 23:00 UTC is 00:00 on the 11th.
    expect(getDaysInStock(stockedAt, 'Europe/London', new Date('2026-06-10T22:59:00Z'))).toBe(0);
    expect(getDaysInStock(stockedAt, 'Europe/London', new Date('2026-06-10T23:00:00Z'))).toBe(1);
  });

  it('gives different ages for the same instant in different time zones', () => {
    const stockedAt = '2026-06-10T03:00:00Z';
    const now = new Date('2026-06-10T20:00:00Z');
    expect(getDaysInStock(stockedAt, 'Asia/Ho_Chi_Minh', now)).toBe(1);
    expect(getDaysInStock(stockedAt, 'Europe/London', now)).toBe(0);
  });

  it('assigns the stocking date using the local calendar', () => {
    // 23:30 UTC on 9 June is already 10 June in Ho Chi Minh City, but still 9 June in New York.
    const stockedAt = '2026-06-09T23:30:00Z';
    const now = new Date('2026-06-10T10:00:00Z');
    expect(getDaysInStock(stockedAt, 'Asia/Ho_Chi_Minh', now)).toBe(0);
    expect(getDaysInStock(stockedAt, 'America/New_York', now)).toBe(1);
  });

  it('counts a 23-hour daylight-saving day as one day', () => {
    // UK clocks go forward on 29 March 2026, so that local day is only 23 hours long.
    const stockedAt = '2026-03-28T23:30:00Z'; // 23:30 GMT on 28 March
    const lateOn29th = new Date('2026-03-29T22:30:00Z'); // 23:30 BST on 29 March
    const startOf30th = new Date('2026-03-29T23:00:00Z'); // 00:00 BST on 30 March
    expect(getDaysInStock(stockedAt, 'Europe/London', lateOn29th)).toBe(1);
    expect(getDaysInStock(stockedAt, 'Europe/London', startOf30th)).toBe(2);
  });

  it('counts a 25-hour daylight-saving day as one day', () => {
    // UK clocks go back on 25 October 2026, so that local day is 25 hours long.
    const stockedAt = '2026-10-24T22:30:00Z'; // 23:30 BST on 24 October
    const lateOn25th = new Date('2026-10-25T23:30:00Z'); // 23:30 GMT on 25 October
    const startOf26th = new Date('2026-10-26T00:00:00Z'); // 00:00 GMT on 26 October
    expect(getDaysInStock(stockedAt, 'Europe/London', lateOn25th)).toBe(1);
    expect(getDaysInStock(stockedAt, 'Europe/London', startOf26th)).toBe(2);
  });

  it('never returns a negative age', () => {
    const now = new Date('2026-06-10T00:00:00Z');
    expect(getDaysInStock('2026-06-12T00:00:00Z', 'Europe/London', now)).toBe(0);
  });
});
