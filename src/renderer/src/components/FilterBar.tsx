import { useFilterStore } from '../store'
import type { ColorLabel } from '../../../types'
import { IconCheck, IconX, IconCircle, IconRefresh, IconArrowUp, IconArrowDown } from '@tabler/icons-react'

export function FilterBar() {
  const { filters, toggleFlag, toggleColorLabel, setFilter, clearFilters } = useFilterStore()

  const hasActiveFilters = !!(
    filters.flags?.length ||
    filters.colorLabels?.length ||
    filters.minRating ||
    filters.duplicatesOnly ||
    filters.minCompositeScore
  )

  return (
    <div className="filter-bar">
      {/* Flag filters */}
      <button
        className={`filter-chip flag-chip-pick ${filters.flags?.includes('pick') ? 'active' : ''}`}
        onClick={() => toggleFlag('pick')}
      >
        <IconCheck size={14} /> Picks
      </button>
      <button
        className={`filter-chip flag-chip-reject ${filters.flags?.includes('reject') ? 'active' : ''}`}
        onClick={() => toggleFlag('reject')}
      >
        <IconX size={14} /> Rejects
      </button>
      <button
        className={`filter-chip flag-chip-unflagged ${filters.flags?.includes('none') ? 'active' : ''}`}
        onClick={() => toggleFlag('none')}
      >
        <IconCircle size={14} /> Unflagged
      </button>

      <div className="toolbar-separator" />

      {/* Color labels */}
      {(['red', 'yellow', 'green', 'blue', 'purple'] as ColorLabel[]).map(color => (
        <button
          key={color}
          className={`filter-chip color-label-chip ${color} ${filters.colorLabels?.includes(color) ? 'active' : ''}`}
          onClick={() => toggleColorLabel(color)}
          title={`${color.charAt(0).toUpperCase() + color.slice(1)} Label`}
        >
          <span className={`color-dot ${color}`} />
        </button>
      ))}

      <div className="toolbar-separator" />

      {/* Duplicates only */}
      <button
        className={`filter-chip ${filters.duplicatesOnly ? 'active' : ''}`}
        onClick={() => setFilter('duplicatesOnly', !filters.duplicatesOnly)}
      >
        <IconRefresh size={14} /> Duplicates
      </button>

      <div className="toolbar-separator" />

      {/* Sort */}
      <div style={{ display: 'flex', gap: 'var(--space-1)', alignItems: 'center' }}>
        <select
          className="select"
          value={filters.sortBy || 'compositeScore'}
          onChange={(e) => setFilter('sortBy', e.target.value as any)}
        >
          <option value="compositeScore">AI Score</option>
          <option value="takenAt">Date Taken</option>
          <option value="fileName">File Name</option>
          <option value="rating">Rating</option>
          <option value="blurScore">Sharpness</option>
          <option value="fileSize">File Size</option>
        </select>
        {(!filters.sortBy || filters.sortBy === 'compositeScore') && (
          <select
            className="select"
            value={filters.minCompositeScore || 0}
            onChange={(e) => {
              const v = Number(e.target.value)
              setFilter('minCompositeScore', v > 0 ? v : undefined)
            }}
          >
            <option value={0}>All Scores</option>
            <option value={0.25}>&gt; 25</option>
            <option value={0.5}>&gt; 50</option>
            <option value={0.75}>&gt; 75</option>
          </select>
        )}
        {filters.sortBy === 'rating' && (
          <select
            className="select"
            value={filters.minRating || 0}
            onChange={(e) => {
              const v = Number(e.target.value)
              setFilter('minRating', v > 0 ? v : undefined)
            }}
          >
            <option value={0}>All Ratings</option>
            <option value={1}>★ 1+</option>
            <option value={2}>★★ 2+</option>
            <option value={3}>★★★ 3+</option>
            <option value={4}>★★★★ 4+</option>
            <option value={5}>★★★★★ 5</option>
          </select>
        )}
        <button
          className="btn btn-icon btn-ghost"
          style={{ height: '32px', width: '32px' }}
          onClick={() =>
            setFilter('sortDirection', filters.sortDirection === 'asc' ? 'desc' : 'asc')
          }
          title={filters.sortDirection === 'asc' ? 'Ascending' : 'Descending'}
        >
          {filters.sortDirection === 'asc' ? <IconArrowUp size={16} /> : <IconArrowDown size={16} />}
        </button>
      </div>

      <div className="toolbar-spacer" />

      {/* Clear all filters */}
      {hasActiveFilters && (
        <button
          className="filter-chip"
          onClick={clearFilters}
        >
          <IconX size={14} /> Clear All
        </button>
      )}
    </div>
  )
}
