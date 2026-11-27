import { fireEvent, render, screen } from '@testing-library/react';

import { describe, expect, it } from 'vitest';
import { ComingSoonProvider } from '../components/ComingSoonDialog';
import QuickActions from './QuickActions';

describe('QuickActions', () => {
  it('shows three enabled buttons that each open the coming soon dialog', () => {
    render(
      <ComingSoonProvider>
        <QuickActions />
      </ComingSoonProvider>,
    );
    for (const name of ['Transfer money', 'Pay a bill', 'Open a savings pot']) {
      expect(screen.getByRole('button', { name })).toBeEnabled();
      fireEvent.click(screen.getByRole('button', { name }));
      expect(screen.getByRole('dialog')).toHaveTextContent('This feature is coming soon.');
      fireEvent.click(screen.getByRole('button', { name: 'Back to dashboard' }));
      expect(screen.queryByRole('dialog')).toBeNull();
    }
  });
});
