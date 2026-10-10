'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { useSession } from '../SessionProvider';

/**
 * Loads a list from the API and exposes helpers to refresh it or drop/replace one item after an action.
 * `refreshing` and `updatedAt` let the page show that a refresh actually happened, even when nothing changed.
 */
export function useQueue<T extends { id: string }>(basePath: string, key: string, params: Record<string, string> = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
  const path = query ? `${basePath}?${query}` : basePath;
  const { user } = useSession();
  const [items, setItems] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const fetchItems = useCallback(
    () =>
      api<Record<string, T[]>>(path)
        .then(
          (data) => {
            setItems(data[key] ?? []);
            setError(null);
            setUpdatedAt(new Date());
          },
          (err) => setError(errorMessage(err)),
        )
        .finally(() => setRefreshing(false)),
    [path, key],
  );

  // Wait for the session so we never fetch on behalf of the previous (or no) user.
  const userId = user?.id;
  useEffect(() => {
    if (userId) fetchItems();
  }, [userId, fetchItems]);

  const reload = useCallback(() => {
    setRefreshing(true);
    return fetchItems();
  }, [fetchItems]);

  const remove = (id: string) => setItems((prev) => prev?.filter((i) => i.id !== id) ?? prev);
  const replace = (item: T) => setItems((prev) => prev?.map((i) => (i.id === item.id ? item : i)) ?? prev);

  return { items, error, reload, refreshing, updatedAt, remove, replace };
}
