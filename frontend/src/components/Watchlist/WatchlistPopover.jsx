import { useRef, useEffect, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { useWatchlist } from '../../hooks/useWatchlist';
import './WatchlistPopover.css';

/**
 * Drop-down popover for adding/removing a symbol from one or more watchlists.
 *
 * Usage:
 *   <WatchlistPopover symbol="RELIANCE.NS" onClose={() => setOpen(false)} anchorRef={btnRef} />
 */
const WatchlistPopover = ({ symbol, onClose, anchorRef }) => {
  const { lists, listsContaining, addSymbol, removeSymbol, createList } = useWatchlist();
  const popoverRef = useRef(null);
  const [newListMode, setNewListMode] = useState(false);
  const [newListName, setNewListName] = useState('');
  const inputRef = useRef(null);

  const inLists = listsContaining(symbol);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target) &&
        anchorRef?.current && !anchorRef.current.contains(e.target)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, anchorRef]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const toggle = (listId) => {
    if (inLists.includes(listId)) {
      removeSymbol(symbol, listId);
    } else {
      addSymbol(symbol, listId);
    }
  };

  const handleCreateList = () => {
    const name = newListName.trim() || 'New List';
    const id = createList(name);
    addSymbol(symbol, id);
    setNewListMode(false);
    setNewListName('');
  };

  const onKey = (e) => {
    if (e.key === 'Enter')  handleCreateList();
    if (e.key === 'Escape') { setNewListMode(false); setNewListName(''); }
  };

  useEffect(() => {
    if (newListMode) setTimeout(() => inputRef.current?.focus(), 0);
  }, [newListMode]);

  return (
    <div className="wlp-popover" ref={popoverRef}>
      <p className="wlp-title">Add to watchlist</p>

      <ul className="wlp-list">
        {lists.map((l) => {
          const checked = inLists.includes(l.id);
          return (
            <li key={l.id} className="wlp-item" onClick={() => toggle(l.id)}>
              <span className={`wlp-check${checked ? ' checked' : ''}`}>
                {checked && <Check size={11} />}
              </span>
              <span className="wlp-list-name">{l.name}</span>
              <span className="wlp-count">{l.symbols.length}</span>
            </li>
          );
        })}
      </ul>

      <div className="wlp-footer">
        {newListMode ? (
          <div className="wlp-new-row">
            <input
              ref={inputRef}
              className="wlp-new-input"
              placeholder="List name…"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={onKey}
            />
            <button className="wlp-new-confirm" onClick={handleCreateList}>
              <Check size={13} />
            </button>
          </div>
        ) : (
          <button className="wlp-new-btn" onClick={() => setNewListMode(true)}>
            <Plus size={12} /> New list
          </button>
        )}
      </div>
    </div>
  );
};

export default WatchlistPopover;
