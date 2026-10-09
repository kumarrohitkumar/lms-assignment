'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { useSession } from '../SessionProvider';

/** Loads a list from the API and exposes helpers to refresh it or drop/replace one item after an action. */
export function useQueue<T extends { id: string }>(path: string, key: string) {
  const { user } = useSession();
  const [items, setItems] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(
    () =>
      api<Record<string, T[]>>(path).then(
        (data) => {
          setItems(data[key] ?? []);
          setError(null);
        },
        (err) => setError(errorMessage(err)),
      ),
    [path, key],
  );

  // Wait for the session so we never fetch on behalf of the previous (or no) user.
  useEffect(() => {
    if (user) fetchItems();
  }, [user, fetchItems]);

  const reload = fetchItems;

  const remove = (id: string) => setItems((prev) => prev?.filter((i) => i.id !== id) ?? prev);
  const replace = (item: T) => setItems((prev) => prev?.map((i) => (i.id === item.id ? item : i)) ?? prev);

  return { items, error, reload, remove, replace };
}
