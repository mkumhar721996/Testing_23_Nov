import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CategoryLabel } from './CategoryLabel';

describe('CategoryLabel', () => {
  it('AC4 keeps a retired category visible, tagged Retired', () => {
    render(<CategoryLabel category={{ id: 'c7', name: 'Client entertainment', retired: true }} />);
    expect(screen.getByText('Client entertainment')).toBeInTheDocument();
    expect(screen.getByText('Retired')).toBeInTheDocument();
  });

  it('shows no tag for an active category', () => {
    render(<CategoryLabel category={{ id: 'c1', name: 'Travel', retired: false }} />);
    expect(screen.queryByText('Retired')).toBeNull();
  });
});
