import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../api/onboarding';
import type { Me, RecordSummary } from '../api/onboarding';
import { OnboardingListPage } from './OnboardingListPage';
import { MeContext } from './status';

vi.mock('../api/onboarding');
const mocked = vi.mocked(api);

const admin: Me = { employeeId: null, displayName: 'Hana Admin', role: 'administrator' };
const manager: Me = { employeeId: 'emp-m', displayName: 'Maya Okafor', role: 'manager' };

const tomas: RecordSummary = {
  id: 'r1',
  employee: { displayName: 'Tomás Herrera', jobTitle: 'Backend engineer', team: 'Platform' },
  startDate: '2026-11-23',
  doneCount: 6,
  totalCount: 14,
  status: 'in_progress',
};
const priyaRecord: RecordSummary = {
  id: 'r2',
  employee: { displayName: 'Priya Raman', jobTitle: 'Product designer', team: 'Design' },
  startDate: '2026-12-01',
  doneCount: 0,
  totalCount: 0,
  status: 'not_started',
};

function renderPage(me: Me) {
  return render(
    <MeContext.Provider value={me}>
      <MemoryRouter>
        <OnboardingListPage />
      </MemoryRouter>
    </MeContext.Provider>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('OnboardingListPage', () => {
  it('lists the hires with progress and a status badge', async () => {
    mocked.listRecords.mockResolvedValue([tomas]);
    renderPage(admin);
    const row = await screen.findByRole('row', { name: /Tomás Herrera/ });
    expect(within(row).getByText('Backend engineer')).toBeInTheDocument();
    expect(within(row).getByText('23 Nov 2026')).toBeInTheDocument();
    expect(within(row).getByText('6/14')).toBeInTheDocument();
    expect(within(row).getByText('In progress')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('1 new hire');
  });

  it('shows skeletons while loading', () => {
    mocked.listRecords.mockReturnValue(new Promise(() => {}));
    const { container } = renderPage(admin);
    expect(container.querySelectorAll('.skeleton.skel-row')).toHaveLength(4);
  });

  it('filters by name or job title', async () => {
    mocked.listRecords.mockResolvedValue([tomas, priyaRecord]);
    renderPage(admin);
    await screen.findByRole('row', { name: /Priya Raman/ });
    await userEvent.type(screen.getByLabelText('Search new hires'), 'designer');
    expect(screen.queryByRole('row', { name: /Tomás/ })).not.toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Priya Raman/ })).toBeInTheDocument();
  });

  it('offers retry on error', async () => {
    mocked.listRecords.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce([tomas]);
    renderPage(admin);
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't load onboardings.");
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('row', { name: /Tomás Herrera/ })).toBeInTheDocument();
  });

  it('invites an administrator to start the first onboarding', async () => {
    mocked.listRecords.mockResolvedValue([]);
    renderPage(admin);
    expect(await screen.findByRole('heading', { name: 'Start your first onboarding' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Start onboarding' })).toHaveLength(2);
  });

  it('hides every start control from a manager', async () => {
    mocked.listRecords.mockResolvedValue([]);
    renderPage(manager);
    await screen.findByRole('heading', { name: 'Start your first onboarding' });
    expect(screen.queryByRole('button', { name: 'Start onboarding' })).not.toBeInTheDocument();
  });

  it('starts an onboarding and shows the new row (AC6)', async () => {
    mocked.listRecords.mockResolvedValue([tomas]);
    mocked.listEmployeesWithoutOnboarding.mockResolvedValue([
      { id: 'emp-a', displayName: 'Priya Raman', jobTitle: 'Product designer', team: 'Design' },
    ]);
    mocked.createRecord.mockResolvedValue({ ...priyaRecord, managerName: 'Maya Okafor', items: [] });
    renderPage(admin);
    await screen.findByRole('row', { name: /Tomás/ });

    await userEvent.click(screen.getByRole('button', { name: 'Start onboarding' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.selectOptions(await within(dialog).findByLabelText('Employee'), 'Priya Raman');
    await userEvent.type(within(dialog).getByLabelText('Start date'), '2026-12-01');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Start onboarding' }));

    expect(await screen.findByRole('row', { name: /Priya Raman/ })).toBeInTheDocument();
    expect(mocked.createRecord).toHaveBeenCalledWith({ employeeId: 'emp-a', startDate: '2026-12-01' });
    expect(screen.getByText('Onboarding started for Priya Raman')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows a field error when the employee is missing', async () => {
    mocked.listRecords.mockResolvedValue([tomas]);
    mocked.listEmployeesWithoutOnboarding.mockResolvedValue([]);
    renderPage(admin);
    await screen.findByRole('row', { name: /Tomás/ });
    await userEvent.click(screen.getByRole('button', { name: 'Start onboarding' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Start onboarding' }));
    expect(within(dialog).getByText('Choose an employee.')).toBeInTheDocument();
    expect(mocked.createRecord).not.toHaveBeenCalled();
  });

  it('has no reminder or due-date controls (AC7, AC8)', async () => {
    mocked.listRecords.mockResolvedValue([tomas]);
    renderPage(admin);
    await screen.findByRole('row', { name: /Tomás/ });
    expect(screen.queryByRole('button', { name: /remind|alerts/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/due|deadline|overdue/i)).not.toBeInTheDocument();
  });
});
