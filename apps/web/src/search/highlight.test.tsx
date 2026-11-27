import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { highlight } from './highlight';

describe('highlight', () => {
  it('marks the match and keeps the original casing', () => {
    const { container } = render(<span>{highlight('Paris, France', 'paris')}</span>);
    const marks = container.querySelectorAll('mark.hit');
    expect(marks).toHaveLength(1);
    expect(marks[0].textContent).toBe('Paris');
    expect(container.textContent).toBe('Paris, France');
  });

  it('does not interpret markup in the name', () => {
    const { container } = render(<span>{highlight('<b>Paris</b>', 'paris')}</span>);
    expect(container.querySelector('b')).toBeNull();
    expect(container.textContent).toBe('<b>Paris</b>');
  });

  it('returns the name unchanged when nothing matches', () => {
    const { container } = render(<span>{highlight('Rome', 'zzz')}</span>);
    expect(container.querySelector('mark')).toBeNull();
    expect(container.textContent).toBe('Rome');
  });
});
