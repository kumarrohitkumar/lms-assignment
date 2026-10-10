import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RefreshButton } from '@/components/dashboard/RefreshButton';
import { useQueue } from '@/components/dashboard/useQueue';

vi.mock('@/components/SessionProvider', () => ({ useSession: () => ({ user: { id: 'u1', role: 'ADMIN' } }) }));

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

afterEach(() => vi.unstubAllGlobals());

describe('<RefreshButton>', () => {
  it('shows progress and is disabled while refreshing', () => {
    render(<RefreshButton onRefresh={vi.fn()} refreshing updatedAt={null} />);
    const button = screen.getByRole('button', { name: /refreshing/i });
    expect(button).toBeDisabled();
  });

  it('shows when the list was last updated and calls onRefresh', () => {
    const onRefresh = vi.fn();
    render(<RefreshButton onRefresh={onRefresh} refreshing={false} updatedAt={new Date('2026-10-10T07:41:05Z')} />);
    expect(screen.getByText(/^Updated /)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});

describe('useQueue refresh', () => {
  it('fetches again on reload, reports progress, and picks up new items', async () => {
    let resolveSecond: (r: Response) => void = () => {};
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ loans: [{ id: 'a' }] }))
      .mockImplementationOnce(() => new Promise<Response>((r) => (resolveSecond = r)));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useQueue<{ id: string }>('/sanction/loans', 'loans'));
    await waitFor(() => expect(result.current.items).toEqual([{ id: 'a' }]));
    const firstUpdate = result.current.updatedAt;
    expect(firstUpdate).toBeInstanceOf(Date);
    expect(result.current.refreshing).toBe(false);

    act(() => {
      result.current.reload();
    });
    expect(result.current.refreshing).toBe(true);

    await act(async () => resolveSecond(json({ loans: [{ id: 'a' }, { id: 'b' }] })));
    await waitFor(() => expect(result.current.items).toEqual([{ id: 'a' }, { id: 'b' }]));
    expect(result.current.refreshing).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]![1]).toMatchObject({ cache: 'no-store' });
  });
});
