import { useMemo } from 'react'
import { usePhotoStore, useUIStore } from '../store'

export function DuplicateView() {
  const { photos, setFlag, setSelectedPhotos } = usePhotoStore()
  const { setViewMode } = useUIStore()

  // Group photos by duplicate_group_id
  const duplicateGroups = useMemo(() => {
    const groups = new Map<number, typeof photos>()
    photos.forEach(p => {
      if (p.duplicateGroupId) {
        if (!groups.has(p.duplicateGroupId)) {
          groups.set(p.duplicateGroupId, [])
        }
        groups.get(p.duplicateGroupId)!.push(p)
      }
    })
    return Array.from(groups.values()).filter(g => g.length > 1)
  }, [photos])

  if (duplicateGroups.length === 0) {
    return (
      <div className="photo-viewer">
        <div className="empty-state">
          <div className="empty-state-icon">✅</div>
          <div className="empty-state-title">No duplicates found</div>
          <div className="empty-state-subtitle">Run AI analysis to find duplicate groups.</div>
        </div>
      </div>
    )
  }

  const handleCompare = (groupPhotos: typeof photos) => {
    // Select this group precisely, then switch to compare mode
    setSelectedPhotos(groupPhotos.map(p => p.id))
    setViewMode('compare')
  }

  return (
    <div className="photo-viewer" style={{ overflowY: 'auto', padding: '24px' }}>
      <h2 style={{ marginBottom: '24px', color: 'var(--text-primary)' }}>
        Duplicate Groups ({duplicateGroups.length})
      </h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {duplicateGroups.map((group, index) => {
          // Find the best photo based on composite score
          const bestPhoto = [...group].sort((a, b) => (b.compositeScore || 0) - (a.compositeScore || 0))[0]

          return (
            <div 
              key={index} 
              style={{ 
                background: 'var(--bg-elevated)', 
                padding: '16px', 
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: 'var(--text-base)' }}>Group {index + 1}</h3>
                <button className="btn btn-sm" onClick={() => handleCompare(group)}>
                  Compare Mode
                </button>
              </div>

              <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
                {group.map(photo => {
                  const isBest = photo.id === bestPhoto.id
                  
                  return (
                    <div 
                      key={photo.id} 
                      style={{ 
                        flex: '0 0 auto', 
                        width: '200px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '8px',
                        border: isBest ? '2px solid var(--primary-color)' : '2px solid transparent',
                        borderRadius: 'var(--radius-md)',
                        padding: '4px'
                      }}
                    >
                      {isBest && (
                        <div style={{ 
                          background: 'var(--primary-color)', 
                          color: 'var(--bg-default)', 
                          fontSize: 'var(--text-xs)', 
                          fontWeight: 600,
                          textAlign: 'center',
                          padding: '2px',
                          borderRadius: 'var(--radius-sm)'
                        }}>
                          ★ Best Quality
                        </div>
                      )}
                      
                      <img 
                        src={'local-file:///' + (photo.thumbnailPath || photo.filePath).replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/')} 
                        alt={photo.fileName}
                        style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                      />
                      
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {photo.fileName}
                      </div>
                      
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        <button
                          className={`btn btn-sm ${photo.flag === 'pick' ? 'btn-success' : ''}`}
                          style={{ flex: 1 }}
                          onClick={() => setFlag(photo.id, photo.flag === 'pick' ? 'none' : 'pick')}
                        >
                          Pick
                        </button>
                        <button
                          className={`btn btn-sm ${photo.flag === 'reject' ? 'btn-danger' : ''}`}
                          style={{ flex: 1 }}
                          onClick={() => setFlag(photo.id, photo.flag === 'reject' ? 'none' : 'reject')}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
