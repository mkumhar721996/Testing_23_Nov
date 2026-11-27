import { fireEvent, render, screen, within } from '@testing-library/react';

import { describe, expect, it } from 'vitest';
import { ComingSoonProvider, useComingSoonDialog } from './ComingSoonDialog';

function Triggers() {
  const { show } = useComingSoonDialog();
  return (
    <>
      <button onClick={show}>Open</button>
      <a href="#/" onClick={show}>
        View all
      </a>
      <button onClick={show}>View account</button>
      <button onClick={show}>Tesco Stores</button>
    </>
  );
}

const setup = () =>
  render(
    <ComingSoonProvider>
      <Triggers />
    </ComingSoonProvider>,
  );

describe('ComingSoonDialog', () => {
  it('opens a modal with the message and closes with focus back on the trigger', () => {
    setup();
    expect(screen.queryByRole('dialog')).toBeNull();
    screen.getByRole('button', { name: 'Open' }).focus();
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByText('This feature is coming soon.')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Back to dashboard' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus();
  });

  it('closes on Escape and on a backdrop click', () => {
    const { container } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    fireEvent.click(document.querySelector('[data-backdrop]') as Element);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(container).toBeTruthy();
  });

  it('shows one identical text for every trigger', () => {
    setup();
    for (const name of ['Open', 'View all', 'View account', 'Tesco Stores']) {
      fireEvent.click(screen.getByText(name));
      expect(screen.getAllByRole('dialog')).toHaveLength(1);
      expect(screen.getByRole('dialog')).toHaveTextContent(
        /^This feature is coming soon\.Back to dashboard$/,
      );
      fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    }
  });
});
