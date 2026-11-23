import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, fetchOrganization, fetchOrganizations } from './api';
import OrganizationsPage from './OrganizationsPage';
import type { ConsultantContact, OrganizationDetail } from './types';

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  fetchOrganizations: vi.fn(),
  fetchOrganization: vi.fn(),
}));

const jane: ConsultantContact = {
  fullName: 'Jane Doe',
  email: 'jane@example.org',
  phone: '+44 113 555 0142',
};
const orgA: OrganizationDetail = {
  id: 'org-a',
  name: 'Org A',
  address: '114 Mill Street, Leeds',
  admin: 'Sam Lee',
  createdBy: 'Sam Patel',
  consultant: jane,
};

const listed = ({ consultant: _consultant, ...item }: OrganizationDetail) => item;

async function openDetails(name = 'Org A') {
  fireEvent.click(await screen.findByRole('button', { name: new RegExp(`row menu for ${name}`, 'i') }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'View details' }));
  return screen.findByRole('complementary', { name: 'Organization details' });
}

beforeEach(() => {
  window.history.replaceState({}, '', '/');
  vi.mocked(fetchOrganizations).mockResolvedValue([listed(orgA)]);
  vi.mocked(fetchOrganization).mockResolvedValue(orgA);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Organizations list', () => {
  it('shows the organization name and the Admin in its row (AC15)', async () => {
    render(<OrganizationsPage />);
    const row = await screen.findByRole('row', { name: /Org A/ });
    expect(within(row).getByText('Org A')).toBeInTheDocument();
    expect(within(row).getByText('Sam Lee')).toBeInTheDocument();
  });

  it('shows the empty state when there are no organizations (AC9)', async () => {
    vi.mocked(fetchOrganizations).mockResolvedValue([]);
    render(<OrganizationsPage />);
    expect(await screen.findByText('No organizations found')).toBeInTheDocument();
  });

  it('has no action control in the empty state (AC10)', async () => {
    vi.mocked(fetchOrganizations).mockResolvedValue([]);
    render(<OrganizationsPage />);
    const empty = await screen.findByTestId('empty-state');
    expect(within(empty).queryByRole('button')).toBeNull();
    expect(within(empty).queryByRole('link')).toBeNull();
  });

  it('shows an error with a retry when the list fails to load', async () => {
    vi.mocked(fetchOrganizations).mockRejectedValueOnce(new ApiError(500));
    render(<OrganizationsPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't load organizations/i);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('row', { name: /Org A/ })).toBeInTheDocument();
  });
});

describe('Organization detail panel', () => {
  it('opens a read-only panel from the row menu (AC1)', async () => {
    render(<OrganizationsPage />);
    const panel = await openDetails();
    expect(within(panel).getByText('Org A')).toBeInTheDocument();
    expect(fetchOrganization).toHaveBeenCalledWith('org-a');
  });

  it('shows Organization, Address, Admin and Created By (AC2)', async () => {
    render(<OrganizationsPage />);
    const panel = await openDetails();
    for (const label of ['Organization', 'Address', 'Admin', 'Created By']) {
      expect(await within(panel).findByText(label)).toBeInTheDocument();
    }
    expect(within(panel).getByText('114 Mill Street, Leeds')).toBeInTheDocument();
    expect(within(panel).getByText('Sam Lee')).toBeInTheDocument();
    expect(within(panel).getByText('Sam Patel')).toBeInTheDocument();
  });

  it('offers no edit or delete control (AC3)', async () => {
    render(<OrganizationsPage />);
    const panel = await openDetails();
    await within(panel).findByText('Sam Patel');
    expect(within(panel).queryByRole('button', { name: /edit|delete/i })).toBeNull();
    expect(within(panel).queryByRole('link', { name: /edit|delete/i })).toBeNull();
  });

  it('shows the consultant below the organization fields (AC4)', async () => {
    render(<OrganizationsPage />);
    const panel = await openDetails();
    const heading = await within(panel).findByRole('heading', { name: 'Fundraising Consultant' });
    const section = heading.parentElement!;
    expect(within(section).getByText('Jane Doe')).toBeInTheDocument();
    expect(within(section).getByText('jane@example.org')).toBeInTheDocument();
    expect(within(section).getByText('+44 113 555 0142')).toBeInTheDocument();
    const createdBy = within(panel).getByText('Sam Patel');
    expect(createdBy.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows a muted Unassigned when there is no consultant (AC5)', async () => {
    vi.mocked(fetchOrganization).mockResolvedValue({ ...orgA, consultant: null });
    render(<OrganizationsPage />);
    const panel = await openDetails();
    expect(await within(panel).findByText('Unassigned')).toHaveClass('muted');
  });

  it.each([['email'], ['phone']] as const)('shows muted Not provided for a missing %s (AC12)', async (field) => {
    vi.mocked(fetchOrganization).mockResolvedValue({ ...orgA, consultant: { ...jane, [field]: null } });
    render(<OrganizationsPage />);
    const panel = await openDetails();
    const heading = await within(panel).findByRole('heading', { name: 'Fundraising Consultant' });
    const section = heading.parentElement!;
    expect(within(section).getByText(field === 'email' ? 'Email' : 'Phone')).toBeInTheDocument();
    expect(within(section).getByText('Not provided')).toHaveClass('muted');
  });

  it('shows an error inside the panel when details fail to load (AC13)', async () => {
    vi.mocked(fetchOrganization).mockRejectedValue(new ApiError(500));
    render(<OrganizationsPage />);
    const panel = await openDetails();
    expect(await within(panel).findByRole('alert')).toHaveTextContent(/couldn't load/i);
  });

  it('offers a retry that replaces the error with the details (AC14)', async () => {
    vi.mocked(fetchOrganization).mockRejectedValueOnce(new ApiError(500));
    render(<OrganizationsPage />);
    const panel = await openDetails();
    await within(panel).findByRole('alert');
    fireEvent.click(within(panel).getByRole('button', { name: 'Try again' }));
    expect(await within(panel).findByText('Jane Doe')).toBeInTheDocument();
    expect(fetchOrganization).toHaveBeenCalledTimes(2);
    expect(within(panel).queryByRole('alert')).toBeNull();
  });

  it('shows access denied without a retry for another organization (AC11)', async () => {
    window.history.replaceState({}, '', '/?org=org-b');
    vi.mocked(fetchOrganization).mockRejectedValue(new ApiError(403));
    render(<OrganizationsPage />);
    const panel = await screen.findByRole('complementary', { name: 'Organization details' });
    expect(await within(panel).findByText(/access denied/i)).toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: 'Try again' })).toBeNull();
  });

  it('closes the panel and clears the link', async () => {
    render(<OrganizationsPage />);
    const panel = await openDetails();
    expect(window.location.search).toBe('?org=org-a');
    fireEvent.click(within(panel).getByRole('button', { name: 'Close details' }));
    expect(screen.queryByRole('complementary', { name: 'Organization details' })).toBeNull();
    expect(window.location.search).toBe('');
  });
});
