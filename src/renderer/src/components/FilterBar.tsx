import { useFilterStore, usePhotoStore } from '../store'
import type { Flag, ColorLabel } from '../../../../types'

export function FilterBar() {
  const { filters, toggleFlag, toggleColorLabel, setFilter, clearFilters } = useFilterStore()
  const { loadPhotos } = usePhotoStore()

  const hasActiveFilters = !!(
    filters.flags?.length ||
    filters.colorLabels?.length ||
    filters.minRating ||
    filters.duplicatesOnly ||
    filters.minCompositeScore
  )

  const handleFilterChange = () => {
    // Reload photos whenever filters change
    setTimeout(() => loadPhotos(), 0)
  }

  return (
    <div className="filter-bar">
      {/* Flag filters */}
      <button
        className={`filter-chip ${filters.flags?.includes('pick') ? 'active' : ''}`}
        onClick={() => { toggleFlag('pick'); handleFilterChange() }}
      >
        ✓ Picks
      </button>
      <button
        className={`filter-chip ${filters.flags?.includes('reject') ? 'active' : ''}`}
        onClick={() => { toggleFlag('reject'); handleFilterChange() }}
      >
        ✕ Rejects
      </button>
      <button
        className={`filter-chip ${filters.flags?.includes('none') ? 'active' : ''}`}
        onClick={() => { toggleFlag('none'); handleFilterChange() }}
      >
        ○ Unflagged
      </button>

      <div className="toolbar-separator" />

      {/* Star rating filter */}
      <select
        className="select"
        value={filters.minRating || 0}
        onChange={(e) => {
          const v = Number(e.target.value)
          setFilter('minRating', v > 0 ? v : undefined)
          handleFilterChange()
        }}
      >
        <option value={0}>All Ratings</option>
        <option value={1}>★ 1+</option>
        <option value={2}>★★ 2+</option>
        <option value={3}>★★★ 3+</option>
        <option value={4}>★★★★ 4+</option>
        <option value={5}>★★★★★ 5</option>
      </select>

      {/* Color labels */}
      {(['red', 'yellow', 'green', 'blue', 'purple'] as ColorLabel[]).map(color => (
        <button
          key={color}
          className={`filter-chip ${filters.colorLabels?.includes(color) ? 'active' : ''}`}
          onClick={() => { toggleColorLabel(color); handleFilterChange() }}
          style={{ padding: '4px 8px' }}
        >
          <span className={`color-dot ${color}`} />
        </button>
      ))}

      <div className="toolbar-separator" />

      {/* Duplicates only */}
      <button
        className={`filter-chip ${filters.duplicatesOnly ? 'active' : ''}`}
        onClick={() => {
          setFilter('duplicatesOnly', !filters.duplicatesOnly)
          handleFilterChange()
        }}
      >
        🔄 Duplicates
      </button>

      <div className="toolbar-spacer" />

      {/* Clear all filters */}
      {hasActiveFilters && (
        <button
          className="filter-chip"
          onClick={() => { clearFilters(); handleFilterChange() }}
        >
          ✕ Clear All
        </button>
      )}
    </div>
  )
}
