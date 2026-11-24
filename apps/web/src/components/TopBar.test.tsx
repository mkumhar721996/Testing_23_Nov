import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TopBar from './TopBar';

describe('TopBar', () => {
  it('holds only the menu button and the logo', () => {
    render(<TopBar />);
    const header = screen.getByRole('banner');
    expect(within(header).getAllByRole('button')).toHaveLength(1);
    expect(within(header).getByRole('button', { name: 'Menu' })).toBeInTheDocument();
    expect(within(header).queryByRole('button', { name: /search|alerts/i })).toBeNull();
    expect(within(header).getByText('Product')).toBeInTheDocument();
  });
});
