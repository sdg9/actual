import type { JSX } from 'react';

import { render, screen, waitFor } from '@testing-library/react';

import { LoadComponent } from './LoadComponent';

it('renders an already downloaded screen synchronously when revisited', async () => {
  const importer = vi.fn(async () => ({
    Screen: () => <div>Ready screen</div>,
  }));
  const first = render(<LoadComponent name="Screen" importer={importer} />);
  await screen.findByText('Ready screen');
  first.unmount();

  render(<LoadComponent name="Screen" importer={importer} />);
  expect(screen.getByText('Ready screen')).toBeInTheDocument();
  expect(importer).toHaveBeenCalledTimes(1);
});

it('reuses sibling exports without loading the same module again', async () => {
  const importer = vi.fn(async () => ({
    First: () => <div>First screen</div>,
    Second: () => <div>Second screen</div>,
  }));
  const first = render(<LoadComponent name="First" importer={importer} />);
  await screen.findByText('First screen');
  first.rerender(<LoadComponent name="Second" importer={importer} />);
  expect(screen.getByText('Second screen')).toBeInTheDocument();
  expect(screen.queryByText('First screen')).not.toBeInTheDocument();
  expect(importer).toHaveBeenCalledTimes(1);
});

it('does not show the old screen when switching importers', async () => {
  const firstImporter = async () => ({ Screen: () => <div>Wide screen</div> });
  let resolve!: (value: { Screen: () => JSX.Element }) => void;
  const narrowImporter = () =>
    new Promise<{ Screen: () => JSX.Element }>(r => {
      resolve = r;
    });
  const first = render(
    <LoadComponent name="Screen" importer={firstImporter} />,
  );
  await screen.findByText('Wide screen');
  first.rerender(<LoadComponent name="Screen" importer={narrowImporter} />);
  expect(screen.queryByText('Wide screen')).not.toBeInTheDocument();
  await waitFor(() => expect(resolve).toBeTypeOf('function'));
  resolve({ Screen: () => <div>Narrow screen</div> });
  await screen.findByText('Narrow screen');
});
