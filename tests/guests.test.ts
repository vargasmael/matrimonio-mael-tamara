import { describe, it, expect } from 'vitest';
import { normalize, guestIdFromName, searchScore } from '@/lib/guests';

describe('normalize', () => {
  it('lowercases and removes accents', () => {
    expect(normalize('MÁEL Vargas')).toBe('mael vargas');
    expect(normalize('José Ñandú')).toBe('jose nandu');
  });
  it('strips punctuation but keeps spaces', () => {
    expect(normalize('María-José Pérez!')).toBe('mariajose perez');
  });
  it('collapses whitespace', () => {
    expect(normalize('  juan   lopez ')).toBe('juan lopez');
  });
});

describe('guestIdFromName', () => {
  it('replaces spaces with hyphens', () => {
    expect(guestIdFromName('Mael Vargas')).toBe('mael-vargas');
  });
  it('drops diacritics', () => {
    expect(guestIdFromName('José Pérez')).toBe('jose-perez');
  });
});

describe('searchScore', () => {
  it('exact match scores 1', () => {
    expect(searchScore('juan perez', 'juan perez')).toBe(1);
  });
  it('prefix match scores 0.9', () => {
    expect(searchScore('juan', 'juan perez')).toBe(0.9);
  });
  it('substring match scores 0.7', () => {
    expect(searchScore('perez', 'juan perez lopez')).toBe(0.7);
  });
  it('word-prefix match scores 0.6', () => {
    expect(searchScore('juan perez', 'juan carlos perez lopez')).toBe(0.6);
  });
  it('no match scores 0', () => {
    expect(searchScore('camila', 'juan perez')).toBe(0);
  });
});