import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExpenseCategoriesPage } from './ExpenseCategoriesPage';

type Cat = { id: string; name: string; retired: boolean };
const seed = (): Cat[] => [
  { id: 'c1', name: 'Travel', retired: false },
  { id: 'c2', name: 'Meals', retired: false },
  { id: 'c3', name: 'Lodging', retired: true },
];
const userEvent = {
  setup: () => ({
    click: async (el: HTMLElement) => {
      el.focus();
      await act(async () => {
        fireEvent.click(el);
      });
    },
    type: async (el: HTMLElement, text: string) => {
      const input = el as HTMLInputElement;
      await act(async () => {
        fireEvent.change(input, { target: { value: input.value + text } });
      });
    },
    clear: async (el: HTMLElement) => {
      await act(async () => {
        fireEvent.change(el, { target: { value: '' } });
      });
    },
    keyboard: async (_keys: string) => {
      await act(async () => {
        fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
      });
    },
  }),
};
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

/** Fake API: GET lists, writes are handled by `write` (default: a plain success). */
function stubApi(opts: { canManage?: boolean; categories?: Cat[]; write?: (url: string, init: RequestInit) => Response } = {}) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (!init?.method || init.method === 'GET') {
      return json(200, { categories: opts.categories ?? seed(), canManage: opts.canManage ?? true });
    }
    const body = init.body ? JSON.parse(String(init.body)) : {};
    if (opts.write) return opts.write(url, init);
    if (init.method === 'POST' && url.endsWith('/retire')) {
      const id = url.split('/').at(-2)!;
      return json(201, { ...seed().find((c) => c.id === id), retired: true });
    }
    if (init.method === 'PATCH') return json(200, { id: url.split('/').at(-1), name: body.name, retired: false });
    return json(201, { id: 'new', name: body.name, retired: false });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
const writes = (m: ReturnType<typeof stubApi>) => m.mock.calls.filter(([, i]) => i?.method && i.method !== 'GET');

afterEach(() => vi.unstubAllGlobals());

describe('ExpenseCategoriesPage', () => {
  it('AC7 renders every returned category with its status and a count line', async () => {
    stubApi();
    render(<ExpenseCategoriesPage />);
    expect(await screen.findByRole('cell', { name: 'Travel' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Lodging' })).toBeInTheDocument();
    expect(screen.getByText('3 categories, 2 active, 1 retired.')).toBeInTheDocument();
  });

  it('AC1 adds a category', async () => {
    const user = userEvent.setup();
    stubApi();
    render(<ExpenseCategoriesPage />);
    await screen.findByRole('cell', { name: 'Travel' });
    await user.click(screen.getByRole('button', { name: 'Add category' }));
    await user.type(screen.getByLabelText('Category name'), 'Software licences');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Add category' }));
    expect(await screen.findByRole('cell', { name: 'Software licences' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('AC10 trims what it shows', async () => {
    const user = userEvent.setup();
    const api = stubApi();
    render(<ExpenseCategoriesPage />);
    await screen.findByRole('cell', { name: 'Travel' });
    await user.click(screen.getByRole('button', { name: 'Add category' }));
    await user.type(screen.getByLabelText('Category name'), '  Parking  ');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Add category' }));
    expect(await screen.findByRole('cell', { name: 'Parking' })).toBeInTheDocument();
    expect(JSON.parse(String(writes(api)[0][1]!.body))).toEqual({ name: 'Parking' });
  });

  it('AC2 renames a category', async () => {
    const user = userEvent.setup();
    stubApi();
    render(<ExpenseCategoriesPage />);
    await user.click(await screen.findByRole('button', { name: 'Rename Travel' }));
    const input = screen.getByLabelText('Category name');
    await user.clear(input);
    await user.type(input, 'Flights');
    await user.click(screen.getByRole('button', { name: 'Save name' }));
    expect(await screen.findByRole('cell', { name: 'Flights' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Travel' })).toBeNull();
  });

  it('AC3 retires a category and shows it as Retired without actions', async () => {
    const user = userEvent.setup();
    stubApi();
    render(<ExpenseCategoriesPage />);
    await user.click(await screen.findByRole('button', { name: 'Retire Meals' }));
    await user.click(screen.getByRole('button', { name: 'Retire category' }));
    const row = (await screen.findByRole('cell', { name: 'Meals' })).closest('tr')!;
    await vi.waitFor(() => expect(within(row).getByText('Retired')).toBeInTheDocument());
    expect(within(row).queryByRole('button')).toBeNull();
  });

  it('AC6 hides changes from a non-admin', async () => {
    stubApi({ canManage: false });
    render(<ExpenseCategoriesPage />);
    await screen.findByRole('cell', { name: 'Travel' });
    expect(screen.getByText(/not an admin/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add category' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^(Rename|Retire) / })).toBeNull();
  });

  it('AC6 shows a refusal when the API says 403 and leaves the list unchanged', async () => {
    const user = userEvent.setup();
    stubApi({ write: () => json(403, { code: 'not_admin', message: 'Only admins.' }) });
    render(<ExpenseCategoriesPage />);
    await screen.findByRole('cell', { name: 'Travel' });
    await user.click(screen.getByRole('button', { name: 'Add category' }));
    await user.type(screen.getByLabelText('Category name'), 'Sneaky');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Add category' }));
    expect(await screen.findByText('Your change was not saved.')).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Sneaky' })).toBeNull();
    expect(screen.getByText('3 categories, 2 active, 1 retired.')).toBeInTheDocument();
  });

  it('AC8 refuses a duplicate with a visible error and keeps the modal open', async () => {
    const user = userEvent.setup();
    const api = stubApi();
    render(<ExpenseCategoriesPage />);
    await screen.findByRole('cell', { name: 'Travel' });
    await user.click(screen.getByRole('button', { name: 'Add category' }));
    await user.type(screen.getByLabelText('Category name'), 'Travel ');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Add category' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('"Travel" already exists');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(writes(api)).toHaveLength(0);
    expect(screen.getAllByRole('cell', { name: 'Travel' })).toHaveLength(1);
  });

  it('AC9 refuses a blank name next to the field and sends nothing', async () => {
    const user = userEvent.setup();
    const api = stubApi();
    render(<ExpenseCategoriesPage />);
    await screen.findByRole('cell', { name: 'Travel' });
    await user.click(screen.getByRole('button', { name: 'Add category' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Add category' }));
    expect(await screen.findByText('Enter a category name.')).toBeInTheDocument();
    expect(screen.getByLabelText('Category name')).toHaveAttribute('aria-invalid', 'true');
    expect(writes(api)).toHaveLength(0);
  });

  it('shows the server error when it refuses a duplicate the page did not know about', async () => {
    const user = userEvent.setup();
    stubApi({ write: () => json(409, { code: 'name_taken', message: '"Fuel" already exists. Choose a different name.' }) });
    render(<ExpenseCategoriesPage />);
    await screen.findByRole('cell', { name: 'Travel' });
    await user.click(screen.getByRole('button', { name: 'Add category' }));
    await user.type(screen.getByLabelText('Category name'), 'Fuel');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Add category' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('"Fuel" already exists');
  });

  it('closes the modal on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    stubApi();
    render(<ExpenseCategoriesPage />);
    await screen.findByRole('cell', { name: 'Travel' });
    const trigger = screen.getByRole('button', { name: 'Add category' });
    await user.click(trigger);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('shows skeleton rows while loading', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    const { container } = render(<ExpenseCategoriesPage />);
    expect(container.querySelectorAll('.skeleton')).toHaveLength(5);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('shows the empty state', async () => {
    stubApi({ categories: [] });
    render(<ExpenseCategoriesPage />);
    expect(await screen.findByText('No expense categories yet')).toBeInTheDocument();
  });

  it('shows an error with a working Try again', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValue(json(200, { categories: seed(), canManage: true }));
    vi.stubGlobal('fetch', fetchMock);
    render(<ExpenseCategoriesPage />);
    expect(await screen.findByText("We couldn't load the expense categories.")).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('cell', { name: 'Travel' })).toBeInTheDocument();
  });
});
