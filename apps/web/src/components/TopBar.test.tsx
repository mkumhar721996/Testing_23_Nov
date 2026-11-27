import { fireEvent, render, screen, within } from '@testing-library/react';

import { describe, expect, it } from 'vitest';
import { ComingSoonProvider } from './ComingSoonDialog';
import TopBar from './TopBar';

const setup = () =>
  render(
    <ComingSoonProvider>
      <TopBar />
    </ComingSoonProvider>,
  );

describe('TopBar', () => {
  it('holds only the menu button and the logo', () => {
    setup();
    const header = screen.getByRole('banner');
    expect(within(header).getAllByRole('button')).toHaveLength(2);
    expect(within(header).getByRole('button', { name: 'Menu' })).toBeVisible();
    expect(within(header).getByRole('button', { name: 'Product home' })).toBeVisible();
    expect(within(header).queryByRole('button', { name: /search|alerts/i })).toBeNull();
    expect(within(header).getByText('Product')).toBeInTheDocument();
  });

  it.each(['Menu', 'Product home'])('opens the coming soon dialog from %s', (name) => {
    setup();
    fireEvent.click(screen.getByRole('button', { name }));
    expect(screen.getByRole('dialog')).toHaveTextContent('This feature is coming soon.');
  });
});
