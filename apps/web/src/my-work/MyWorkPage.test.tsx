import { fireEvent, render as baseRender, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ComingSoonProvider } from '../components/ComingSoonDialog';
import MyWorkPage from './MyWorkPage';

const render = (ui: ReactElement) => baseRender(<ComingSoonProvider>{ui}</ComingSoonProvider>);
import { fetchMyWork } from './my-work-api';
import type { DefectSummary, MyWorkResponse } from './types';

vi.mock('./my-work-api', () => ({ fetchMyWork: vi.fn() }));
const fetchMock = vi.mocked(fetchMyWork);

const defect = (n: number, overrides: Partial<DefectSummary> = {}): DefectSummary => ({
  id: `d${n}`,
  key: `DEF-${n}`,
  title: `Defect ${n}`,
  severity: 'High',
  status: 'Open',
  projectName: 'Payments portal',
  createdByName: 'Manoj',
  updatedAt: new Date(Date.now() - n * 60000).toISOString(),
  ...overrides,
});
const range = (count: number) => Array.from({ length: count }, (_, i) => defect(i + 1));
const response = (overrides: Partial<MyWorkResponse> = {}): MyWorkResponse => ({
  openDefects: { items: [], total: 0 },
  recentlyUpdated: [],
  hasAnyDefects: false,
  projects: [{ id: 'p1', name: 'Payments portal' }],
  ...overrides,
});
const panel = (name: string) => within(screen.getByRole('region', { name }));

beforeEach(() => {
  fetchMock.mockReset();
});

describe('MyWorkPage', () => {
  it('lists open defects and recently updated defects as links to their defect page', async () => {
    const fixLogin = defect(1, { id: 'd1', title: 'Fix login' });
    fetchMock.mockResolvedValue(
      response({
        openDefects: { items: [fixLogin], total: 1 },
        recentlyUpdated: [fixLogin],
        hasAnyDefects: true,
      }),
    );
    render(<MyWorkPage />);
    const open = within(await screen.findByRole('region', { name: 'My open defects' }));
    expect(open.getByRole('link', { name: /Fix login/ })).toHaveAttribute('href', '#/defects/d1');
    expect(open.getByText('1 open')).toBeInTheDocument();
    expect(panel('Recently updated').getByRole('link', { name: /Fix login/ })).toHaveAttribute(
      'href',
      '#/defects/d1',
    );
    expect(screen.getByText('Latest 10 in all your projects')).toBeInTheDocument();
  });

  it('shows the row details', async () => {
    fetchMock.mockResolvedValue(
      response({ recentlyUpdated: [defect(1)], hasAnyDefects: true }),
    );
    render(<MyWorkPage />);
    const row = within(await screen.findByRole('link', { name: /Defect 1/ }));
    expect(row.getByText('DEF-1')).toBeInTheDocument();
    expect(row.getByText('High')).toBeInTheDocument();
    expect(row.getByText('Open')).toBeInTheDocument();
    expect(row.getByText('Payments portal')).toBeInTheDocument();
    expect(row.getByText('Created by Manoj')).toBeInTheDocument();
    expect(row.getByText('Updated 1 min ago')).toBeInTheDocument();
  });

  it('shows the heading and none of the old dashboard content', async () => {
    fetchMock.mockResolvedValue(response({ recentlyUpdated: [defect(1)], hasAnyDefects: true }));
    render(<MyWorkPage />);
    expect(await screen.findByRole('heading', { level: 1, name: 'My work' })).toBeInTheDocument();
    expect(screen.queryByText(/Good (morning|afternoon|evening)/)).toBeNull();
    expect(screen.queryByRole('region', { name: 'Credit cards' })).toBeNull();
    expect(screen.queryByRole('list', { name: /Recent transactions/ })).toBeNull();
  });

  it('caps nothing itself: 10 open defects show no see-all button', async () => {
    fetchMock.mockResolvedValue(
      response({ openDefects: { items: range(10), total: 10 }, hasAnyDefects: true }),
    );
    render(<MyWorkPage />);
    await screen.findByRole('region', { name: 'My open defects' });
    expect(screen.queryByRole('button', { name: 'See all open defects' })).toBeNull();
  });

  it('shows a see-all button when more than 10 are open and explains it is coming soon', async () => {
    fetchMock.mockResolvedValue(
      response({ openDefects: { items: range(10), total: 11 }, hasAnyDefects: true }),
    );
    render(<MyWorkPage />);
    const open = within(await screen.findByRole('region', { name: 'My open defects' }));
    expect(open.getAllByRole('link', { name: /DEF-/ })).toHaveLength(10);
    fireEvent.click(open.getByRole('button', { name: 'See all open defects' }));
    expect(await screen.findByRole('status')).toHaveTextContent('All open defects is coming soon.');
  });

  it('shows an inline empty message in the open panel when nothing is assigned', async () => {
    fetchMock.mockResolvedValue(
      response({ recentlyUpdated: range(2), hasAnyDefects: true }),
    );
    render(<MyWorkPage />);
    await screen.findByRole('region', { name: 'My open defects' });
    expect(panel('My open defects').getByText('No defects found')).toBeInTheDocument();
    expect(panel('Recently updated').getAllByRole('link').length).toBeGreaterThan(0);
    expect(screen.queryByRole('heading', { name: 'No defects found', level: 3 })).toBeNull();
  });

  it('shows the empty state with a create-defect call-to-action for a new person', async () => {
    fetchMock.mockResolvedValue(response());
    render(<MyWorkPage />);
    expect(await screen.findByRole('heading', { name: 'No defects found', level: 3 })).toBeInTheDocument();
    const links = screen.getAllByRole('link', { name: 'Create defect' });
    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => expect(link).toHaveAttribute('href', '#/defects/new'));
  });

  it('shows busy skeleton panels while loading', () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    const { container } = render(<MyWorkPage />);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('shows an error and refetches on Try again', async () => {
    fetchMock.mockRejectedValueOnce(new Error('boom'));
    render(<MyWorkPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't load your defects");
    fetchMock.mockResolvedValueOnce(response({ recentlyUpdated: [defect(1)], hasAnyDefects: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('link', { name: /Defect 1/ })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
