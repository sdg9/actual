import type { ReactNode } from 'react';

import { act, render, screen } from '@testing-library/react';

import { SheetNameProvider } from './useSheetName';
import { useSheetValue } from './useSheetValue';
import { SpreadsheetProvider, useSpreadsheet } from './useSpreadsheet';

// Exercise the real cache/subscription lifecycle; only the worker boundary is fake.
type CellResult = { name: string; value: number };
const worker = vi.hoisted(() => ({
  requests: [] as ((result: CellResult) => void)[],
  changed: (_nodes: { name: string; value: number }[]) => {
    /* installed by listen */
  },
}));
vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: vi.fn(() => new Promise(resolve => worker.requests.push(resolve))),
  listen: vi.fn((_event, callback) => {
    worker.changed = callback;
    return vi.fn();
  }),
}));

beforeEach(() => {
  worker.requests = [];
});

function Seed({ children }: { children: ReactNode }) {
  const sheet = useSpreadsheet();
  sheet.prewarmCache('oct!budget', { name: 'oct!budget', value: 12500 });
  sheet.prewarmCache('nov!budget', { name: 'nov!budget', value: 0 });
  return children;
}

it('renders prewarmed values immediately and keeps receiving worker updates', () => {
  const rendered: (number | null)[] = [];
  function Cell() {
    const value = useSheetValue<'envelope-budget', 'budget'>('budget');
    rendered.push(value);
    return <span data-testid="amount">{String(value)}</span>;
  }
  function Budget({ month }: { month: string }) {
    return (
      <SpreadsheetProvider>
        <Seed>
          <SheetNameProvider name={month}>
            <Cell />
          </SheetNameProvider>
        </Seed>
      </SpreadsheetProvider>
    );
  }
  const view = render(<Budget month="oct" />);
  expect(rendered).toEqual([12500]);
  act(() => worker.changed([{ name: 'oct!budget', value: 15000 }]));
  expect(screen.getByTestId('amount')).toHaveTextContent('15000');
  rendered.length = 0;
  view.rerender(<Budget month="nov" />);
  expect(screen.getByTestId('amount')).toHaveTextContent('0');
  expect(rendered).not.toContain(15000);
  act(() => worker.changed([{ name: 'oct!budget', value: 99000 }]));
  expect(screen.getByTestId('amount')).toHaveTextContent('0');
  act(() => worker.changed([{ name: 'nov!budget', value: 25000 }]));
  expect(screen.getByTestId('amount')).toHaveTextContent('25000');
});

it.each([false, true])(
  'refreshes a cell from the worker (prewarmed: %s)',
  async prewarmed => {
    function Cell() {
      const value = useSheetValue<'envelope-budget', 'budget'>('budget');
      return <span data-testid="amount">{String(value)}</span>;
    }
    render(
      <SpreadsheetProvider>
        <SheetNameProvider name="oct">
          {prewarmed ? (
            <Seed>
              <Cell />
            </Seed>
          ) : (
            <Cell />
          )}
        </SheetNameProvider>
      </SpreadsheetProvider>,
    );
    expect(screen.getByTestId('amount')).toHaveTextContent(
      prewarmed ? '12500' : 'null',
    );
    await act(async () =>
      worker.requests[0]({ name: 'oct!budget', value: 23000 }),
    );
    expect(screen.getByTestId('amount')).toHaveTextContent('23000');
  },
);

it('does not overwrite a newer change event with a delayed worker read', async () => {
  function Cell() {
    const value = useSheetValue<'envelope-budget', 'budget'>('budget');
    return <span data-testid="amount">{String(value)}</span>;
  }
  render(
    <SpreadsheetProvider>
      <Seed>
        <SheetNameProvider name="oct">
          <Cell />
        </SheetNameProvider>
      </Seed>
    </SpreadsheetProvider>,
  );
  act(() => worker.changed([{ name: 'oct!budget', value: 35000 }]));
  await act(async () =>
    worker.requests[0]({ name: 'oct!budget', value: 23000 }),
  );
  expect(screen.getByTestId('amount')).toHaveTextContent('35000');
});
