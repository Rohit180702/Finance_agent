import { useState, useCallback } from 'react';

const KEY = 'watchlists_v2';

const makeId = () => Math.random().toString(36).slice(2, 9);

const DEFAULT_STATE = () => ({
  lists: [{ id: 'default', name: 'My Watchlist', symbols: [] }],
  activeListId: 'default',
});

const load = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_STATE();
    const parsed = JSON.parse(raw);
    // Migrate from old single-list format (array of symbols)
    if (Array.isArray(parsed)) {
      return {
        lists: [{ id: 'default', name: 'My Watchlist', symbols: parsed }],
        activeListId: 'default',
      };
    }
    if (parsed?.lists) return parsed;
    return DEFAULT_STATE();
  } catch {
    return DEFAULT_STATE();
  }
};

const save = (state) => localStorage.setItem(KEY, JSON.stringify(state));

export const useWatchlist = () => {
  const [state, setState] = useState(load);

  const update = useCallback((fn) => {
    setState((prev) => {
      const next = fn(prev);
      save(next);
      return next;
    });
  }, []);

  /* ── list management ─────────────────────────── */

  const createList = useCallback((name = 'New List') => {
    const id = makeId();
    update((prev) => ({
      ...prev,
      lists: [...prev.lists, { id, name, symbols: [] }],
      activeListId: id,
    }));
    return id;
  }, [update]);

  const deleteList = useCallback((id) => {
    update((prev) => {
      const lists = prev.lists.filter((l) => l.id !== id);
      if (!lists.length) {
        const newDefault = { id: 'default', name: 'My Watchlist', symbols: [] };
        return { lists: [newDefault], activeListId: 'default' };
      }
      const activeListId =
        prev.activeListId === id ? lists[lists.length - 1].id : prev.activeListId;
      return { lists, activeListId };
    });
  }, [update]);

  const renameList = useCallback((id, name) => {
    update((prev) => ({
      ...prev,
      lists: prev.lists.map((l) => (l.id === id ? { ...l, name } : l)),
    }));
  }, [update]);

  const setActiveListId = useCallback((id) => {
    update((prev) => ({ ...prev, activeListId: id }));
  }, [update]);

  /* ── symbol management ───────────────────────── */

  const addSymbol = useCallback((symbol, listId) => {
    update((prev) => ({
      ...prev,
      lists: prev.lists.map((l) => {
        const tid = listId ?? prev.activeListId;
        if (l.id !== tid || l.symbols.includes(symbol)) return l;
        return { ...l, symbols: [...l.symbols, symbol] };
      }),
    }));
  }, [update]);

  const removeSymbol = useCallback((symbol, listId) => {
    update((prev) => ({
      ...prev,
      lists: prev.lists.map((l) => {
        const tid = listId ?? prev.activeListId;
        if (l.id !== tid) return l;
        return { ...l, symbols: l.symbols.filter((s) => s !== symbol) };
      }),
    }));
  }, [update]);

  const toggleSymbol = useCallback((symbol, listId) => {
    update((prev) => ({
      ...prev,
      lists: prev.lists.map((l) => {
        const tid = listId ?? prev.activeListId;
        if (l.id !== tid) return l;
        const symbols = l.symbols.includes(symbol)
          ? l.symbols.filter((s) => s !== symbol)
          : [...l.symbols, symbol];
        return { ...l, symbols };
      }),
    }));
  }, [update]);

  /* ── derived helpers ─────────────────────────── */

  const activeList = state.lists.find((l) => l.id === state.activeListId)
    ?? state.lists[0];

  const isWatched = useCallback(
    (symbol, listId) => {
      const list = listId
        ? state.lists.find((l) => l.id === listId)
        : activeList;
      return list?.symbols.includes(symbol) ?? false;
    },
    [state.lists, activeList]
  );

  // Which lists contain this symbol
  const listsContaining = useCallback(
    (symbol) => state.lists.filter((l) => l.symbols.includes(symbol)).map((l) => l.id),
    [state.lists]
  );

  const isWatchedInAny = useCallback(
    (symbol) => state.lists.some((l) => l.symbols.includes(symbol)),
    [state.lists]
  );

  return {
    lists:          state.lists,
    activeListId:   state.activeListId,
    activeList,
    setActiveListId,
    createList,
    deleteList,
    renameList,
    addSymbol,
    removeSymbol,
    toggleSymbol,
    isWatched,
    isWatchedInAny,
    listsContaining,
  };
};
