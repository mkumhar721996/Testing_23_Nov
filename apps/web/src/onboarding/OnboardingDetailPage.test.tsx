import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../api/onboarding';
import type { Me, RecordDetail } from '../api/onboarding';
import { ApiError } from '../api/client';
import { OnboardingDetailPage } from './OnboardingDetailPage';
import { MeContext } from './status';

vi.mock('../api/onboarding');
const mocked = vi.mocked(api);

const admin: Me = { employeeId: null, displayName: 'Hana Admin', role: 'administrator' };
const employee: Me = { employeeId: 'emp-a', displayName: 'Priya Raman', role: 'employee' };
const manager: Me = { employeeId: 'emp-m', displayName: 'Maya Okafor', role: 'manager' };

const record: RecordDetail = {
  id: 'r1',
  employee: { displayName: 'Priya Raman', jobTitle: 'Product designer', team: 'Design' },
  startDate: '2026-12-01',
  doneCount: 1,
  totalCount: 2,
  status: 'in_progress',
  managerName: 'Maya Okafor',
  items: [
    { id: 'i1', stage: 'before_day_one', title: 'Order laptop', ownerName: 'IT desk', done: true, position: 0 },
    { id: 'i2', stage: 'first_week', title: 'Office tour', ownerName: 'Maya Okafor', done: false, position: 1 },
  ],
};
const empty: RecordDetail = { ...record, doneCount: 0, totalCount: 0, status: 'not_started', items: [] };

function renderPage(me: Me) {
  return render(
    <MeContext.Provider value={me}>
      <MemoryRouter initialEntries={['/onboarding/r1']}>
        <Routes>
          <Route path="/onboarding/:id" element={<OnboardingDetailPage />} />
          <Route path="/onboarding" element={<p>list</p>} />
        </Routes>
      </MemoryRouter>
    </MeContext.Provider>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('OnboardingDetailPage', () => {
  it('shows the record, grouped checklist and details', async () => {
    mocked.getRecord.mockResolvedValue(record);
    renderPage(manager);
    expect(await screen.findByRole('heading', { level: 1, name: 'Priya Raman' })).toBeInTheDocument();
    expect(screen.getByText('Product designer, Design. Starts 1 Dec 2026.')).toBeInTheDocument();
    expect(screen.getByText('1 of 2 tasks done')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Before day one' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'First week' })).toBeInTheDocument();
    expect(screen.getByText('Manager').nextElementSibling).toHaveTextContent('Maya Okafor');
    expect(screen.getByText('In progress')).toBeInTheDocument();
  });

  it('has no due dates, deadlines or reminders (AC7, AC8)', async () => {
    mocked.getRecord.mockResolvedValue(record);
    renderPage(admin);
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByText(/due|deadline|overdue/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remind/i })).not.toBeInTheDocument();
  });

  it.each([
    ['manager', manager],
    ['employee', employee],
  ])('disables the checklist and hides edit controls for a %s (AC14)', async (_n, me) => {
    mocked.getRecord.mockResolvedValue(record);
    renderPage(me);
    await screen.findByRole('heading', { level: 1 });
    screen.getAllByRole('checkbox').forEach((c) => expect(c).toBeDisabled());
    expect(screen.queryByRole('button', { name: 'Add checklist item' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit start date' })).not.toBeInTheDocument();
  });

  it('lets an administrator tick an item (AC9)', async () => {
    mocked.getRecord.mockResolvedValue(record);
    mocked.setItemDone.mockResolvedValue({ ...record.items[1], done: true });
    renderPage(admin);
    const box = await screen.findByLabelText(/Office tour/);
    await userEvent.click(box);
    expect(mocked.setItemDone).toHaveBeenCalledWith('r1', 'i2', true);
    expect(await screen.findByText('2 of 2 tasks done')).toBeInTheDocument();
    expect(screen.getByLabelText(/Office tour/)).toBeChecked();
  });

  it('lets an administrator add a checklist item (AC5)', async () => {
    mocked.getRecord.mockResolvedValue(record);
    mocked.addItem.mockResolvedValue({
      id: 'i3',
      stage: 'first_week',
      title: 'Meet the team',
      ownerName: '',
      done: false,
      position: 2,
    });
    renderPage(admin);
    await userEvent.click(await screen.findByRole('button', { name: 'Add checklist item' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Title'), 'Meet the team');
    await userEvent.selectOptions(within(dialog).getByLabelText('Stage'), 'First week');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add item' }));
    expect(mocked.addItem).toHaveBeenCalledWith('r1', {
      stage: 'first_week',
      title: 'Meet the team',
      ownerName: '',
    });
    const section = (await screen.findByRole('heading', { name: 'First week' })).closest('section')!;
    expect(await within(section).findByLabelText(/Meet the team/)).toBeInTheDocument();
  });

  it('shows a field error next to the title when the API refuses it', async () => {
    mocked.getRecord.mockResolvedValue(record);
    mocked.addItem.mockRejectedValue(new ApiError(400, { title: 'String must contain at least 1 character(s)' }));
    renderPage(admin);
    await userEvent.click(await screen.findByRole('button', { name: 'Add checklist item' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add item' }));
    expect(within(dialog).getByText('Enter a title.')).toBeInTheDocument();
    expect(mocked.addItem).not.toHaveBeenCalled();
    await userEvent.type(within(dialog).getByLabelText('Title'), 'x');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add item' }));
    expect(await within(dialog).findByText(/at least 1 character/)).toBeInTheDocument();
  });

  it('lets an administrator edit the start date (AC9)', async () => {
    mocked.getRecord.mockResolvedValue(record);
    mocked.updateStartDate.mockResolvedValue({ ...record, startDate: '2027-01-04' });
    renderPage(admin);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit start date' }));
    const dialog = screen.getByRole('dialog');
    const input = within(dialog).getByLabelText('Start date');
    await userEvent.clear(input);
    await userEvent.type(input, '2027-01-04');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Product designer, Design. Starts 4 Jan 2027.')).toBeInTheDocument();
  });

  it('says no items are set when the checklist is empty (AC15)', async () => {
    mocked.getRecord.mockResolvedValue(empty);
    renderPage(employee);
    expect(await screen.findByText(/No items are set yet/)).toBeInTheDocument();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Add checklist item' })).not.toBeInTheDocument();
  });

  it('offers an administrator exactly one add action on an empty checklist', async () => {
    mocked.getRecord.mockResolvedValue(empty);
    renderPage(admin);
    await screen.findByText(/No items are set yet/);
    expect(screen.getAllByRole('button', { name: 'Add checklist item' })).toHaveLength(1);
  });

  it('shows no record data when access is refused (AC2)', async () => {
    mocked.getRecord.mockRejectedValue(new ApiError(403));
    renderPage(employee);
    expect(await screen.findByRole('alert')).toHaveTextContent("You don't have access to this onboarding record.");
    expect(screen.queryByText('Priya Raman')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to onboarding' })).toBeInTheDocument();
  });

  it('shows a retry for other errors', async () => {
    mocked.getRecord.mockRejectedValueOnce(new ApiError(500)).mockResolvedValueOnce(record);
    renderPage(admin);
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't load this onboarding.");
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Priya Raman' })).toBeInTheDocument();
  });

  it('shows five skeleton rows while loading', () => {
    mocked.getRecord.mockReturnValue(new Promise(() => {}));
    const { container } = renderPage(admin);
    expect(container.querySelectorAll('.skeleton.skel-row')).toHaveLength(5);
  });
});
