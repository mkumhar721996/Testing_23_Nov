import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Messages from './Messages';
import { fetchMessages } from './dashboard-api';

vi.mock('./dashboard-api', () => ({ fetchMessages: vi.fn() }));

const messages = [
  { id: 'e', from: 'Europia Hotel', initials: 'EH', preview: 'We are pleased to announce…', unread: 1 },
  { id: 'g', from: 'Global Travel Co', initials: 'GT', preview: 'We have updated our com…', unread: 3 },
  { id: 'r', from: 'Read Partner', initials: 'RP', preview: 'Thanks', unread: 0 },
];

describe('Messages', () => {
  afterEach(() => vi.clearAllMocks());

  it('shows senders and unread badges only when unread', async () => {
    vi.mocked(fetchMessages).mockResolvedValue(messages);
    render(<Messages onComingSoon={vi.fn()} />);
    expect(await screen.findByRole('heading', { name: 'Messages' })).toBeInTheDocument();
    expect(await screen.findByText('Europia Hotel')).toBeInTheDocument();
    expect(screen.getByLabelText('3 unread')).toBeInTheDocument();
    expect(screen.queryByLabelText('0 unread')).toBeNull();
  });

  it('shows a skeleton while loading', () => {
    vi.mocked(fetchMessages).mockReturnValue(new Promise(() => {}));
    const { container } = render(<Messages onComingSoon={vi.fn()} />);
    expect(container.querySelector('[aria-busy="true"] .skeleton')).not.toBeNull();
  });

  it('shows the empty copy', async () => {
    vi.mocked(fetchMessages).mockResolvedValue([]);
    render(<Messages onComingSoon={vi.fn()} />);
    expect(
      await screen.findByText("You're all caught up. New messages from hotels and partners will show here."),
    ).toBeInTheDocument();
  });

  it('shows an error and refetches on Try again', async () => {
    vi.mocked(fetchMessages).mockRejectedValueOnce(new Error('x')).mockResolvedValue(messages);
    render(<Messages onComingSoon={vi.fn()} />);
    expect(await screen.findByText("We couldn't load your messages.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Europia Hotel')).toBeInTheDocument();
    expect(fetchMessages).toHaveBeenCalledTimes(2);
  });

  it('reports the options menu as coming soon', async () => {
    const onComingSoon = vi.fn();
    vi.mocked(fetchMessages).mockResolvedValue(messages);
    render(<Messages onComingSoon={onComingSoon} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Message options' }));
    expect(onComingSoon).toHaveBeenCalledWith('Message options');
  });
});
