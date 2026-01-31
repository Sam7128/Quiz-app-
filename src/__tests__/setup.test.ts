import { render } from '@testing-library/react';

describe('Setup Test', () => {
  it('should pass basic sanity check', () => {
    expect(1 + 1).toBe(2);
  });

  it('should import @testing-library/react', () => {
    expect(render).toBeDefined();
  });
});