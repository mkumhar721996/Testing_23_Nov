import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectHealth from './ProjectHealth';
import { fetchProjectHealth, selectProject } from './project-health-api';
import type { ProjectHealth as Health } from './types';

vi.mock('./project-health-api', () => ({ fetchProjectHealth: vi.fn(), selectProject: vi.fn() }));
const fetchMock = vi.mocked(fetchProjectHealth);
const selectMock = vi.mocked(selectProject);

const STATUSES = ['New', 'Open', 'In Progress', 'Reopened', 'Resolved', 'Closed'];
const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];
const PROJECTS = [
  { id: 'A', name: 'Field service app' },
  { id: 'B', name: 'Payments portal' },
];
const health = (overrides: Partial<Health> = {}): Health => ({
  projects: PROJECTS,
  selectedProjectId: 'A',
  selectionReason: 'last-viewed',
  total: 5,
  byStatus: STATUSES.map((name) => ({ name, count: name === 'Open' ? 5 : 0 })),
  bySeverity: SEVERITIES.map((name) => ({ name, count: name === 'High' ? 5 : 0 })),
  ...overrides,
});

beforeEach(() => {
  fetchMock.mockReset();
  selectMock.mockReset();
});

describe('ProjectHealth', () => {
  it('shows a count for every status and severity, zeros included (AC1, AC2)', async () => {
    fetchMock.mockResolvedValue(health());
    render(<ProjectHealth />);
    const status = within(await screen.findByRole('group', { name: 'Defects by status' }));
    expect(status.getAllByText(/^\d+$/).map((n) => n.textContent)).toEqual([
      '0', '5', '0', '0', '0', '0',
    ]);
    expect(status.getByText('In progress')).toBeInTheDocument();
    const severity = within(screen.getByRole('group', { name: 'Defects by severity' }));
    expect(severity.getAllByText(/^\d+$/)).toHaveLength(4);
    expect(screen.queryByText('No defects found')).toBeNull();
  });

  it('lists the person’s projects in the switcher with the selected one marked (AC3, AC4)', async () => {
    fetchMock.mockResolvedValue(health({ selectedProjectId: 'B' }));
    render(<ProjectHealth />);
    const button = await screen.findByRole('button', { name: 'Project' });
    expect(button).toHaveTextContent('Payments portal');
    fireEvent.click(button);
    const options = within(screen.getByRole('listbox', { name: 'Your projects' })).getAllByRole(
      'option',
    );
    expect(options.map((o) => o.textContent)).toEqual(['Field service app', 'Payments portal']);
    expect(options[1]).toHaveAttribute('aria-checked', 'true');
    expect(options[0]).toHaveAttribute('aria-checked', 'false');
  });

  it('shows the counts of the project picked in the switcher (AC7)', async () => {
    fetchMock.mockResolvedValue(health());
    selectMock.mockResolvedValue(
      health({
        selectedProjectId: 'B',
        selectionReason: 'picked',
        total: 3,
        byStatus: STATUSES.map((name) => ({ name, count: name === 'Closed' ? 3 : 0 })),
        bySeverity: SEVERITIES.map((name) => ({ name, count: name === 'Low' ? 3 : 0 })),
      }),
    );
    render(<ProjectHealth />);
    fireEvent.click(await screen.findByRole('button', { name: 'Project' }));
    fireEvent.click(screen.getByRole('option', { name: 'Payments portal' }));
    expect(selectMock).toHaveBeenCalledWith('B', expect.anything());
    const status = within(await screen.findByRole('group', { name: 'Defects by status' }));
    expect(status.getAllByText('3')).toHaveLength(1);
    expect(status.queryByText('5')).toBeNull();
    expect(screen.getByRole('button', { name: 'Project' })).toHaveTextContent('Payments portal');
    expect(screen.getByText('Showing Payments portal. Your choice is remembered next time.')).toBeInTheDocument();
  });

  it('shows the empty state with a create-defect link when the project has no defects (AC8, AC9)', async () => {
    fetchMock.mockResolvedValue(health({ total: 0 }));
    render(<ProjectHealth />);
    expect(await screen.findByText('No defects found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create defect' })).toHaveAttribute(
      'href',
      '#/defects/new',
    );
    expect(screen.queryByRole('group', { name: 'Defects by status' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Project' })).toBeInTheDocument();
  });

  it('shows no switcher but the empty state for a person with no project (AC11-13)', async () => {
    fetchMock.mockResolvedValue(
      health({ projects: [], selectedProjectId: null, selectionReason: null, total: 0 }),
    );
    render(<ProjectHealth />);
    expect(await screen.findByText('No defects found')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Project' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Create defect' })).toBeInTheDocument();
  });

  it.each([
    ['last-viewed', 'Showing Field service app, the project you last viewed.'],
    ['first-visit', 'Showing Field service app, the first of your projects. Your choice is remembered next time.'],
    ['fallback', 'You no longer have a role in the project you last viewed, so Field service app is shown instead.'],
  ] as const)('explains the %s selection (AC5, AC14)', async (selectionReason, hint) => {
    fetchMock.mockResolvedValue(health({ selectionReason }));
    render(<ProjectHealth />);
    expect(await screen.findByText(hint)).toBeInTheDocument();
  });

  it('shows an error with a retry', async () => {
    fetchMock.mockRejectedValueOnce(new Error('boom')).mockResolvedValue(health());
    render(<ProjectHealth />);
    expect(await screen.findByText("We couldn't load the project's defect counts")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('group', { name: 'Defects by status' })).toBeInTheDocument();
  });
});
