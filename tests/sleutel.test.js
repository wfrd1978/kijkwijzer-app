import { describe, expect, it } from 'vitest';
import { soortSleutel } from '../src/sleutel.js';

describe('soortSleutel', () => {
  it('herkent de korte API Key', () => {
    expect(soortSleutel('0123456789abcdef0123456789ABCDEF')).toBe('key');
  });
  it('herkent de lange Read Access Token', () => {
    expect(soortSleutel('  eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJ4In0.abc_DEF-123  ')).toBe('token');
  });
  it('weigert iets anders', () => {
    expect(soortSleutel('')).toBe(null);
    expect(soortSleutel('mijn sleutel')).toBe(null);
    expect(soortSleutel('0123456789abcdef')).toBe(null);
  });
});

import { veiligeUrl } from '../src/veilig.js';
describe('veiligeUrl', () => {
  it('kan niet uit een attribuut breken', () => {
    expect(veiligeUrl('https://x.nl/"><meta>')).not.toMatch(/["<>]/);
    expect(veiligeUrl('javascript:alert(1)')).toBe('');
    expect(veiligeUrl('https://image.tmdb.org/t/p/w185/a.jpg')).toBe('https://image.tmdb.org/t/p/w185/a.jpg');
  });
});
