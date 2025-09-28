import { useEffect, useState } from 'react'
import { authFetch } from '../auth.js'

export default function Projects() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const resp = await authFetch('/api/projects')
        const data = await resp.json()
        setItems(Array.isArray(data) ? data : [])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div>
      <div className="hero" style={{marginTop: 0}}>
        <div className="title hero-title">历史项目</div>
      </div>
      <div className="subtle-sep" />

      {loading ? (
        <div className="spinner" />
      ) : (
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
          {items.map(p => (
            <article key={p.id} className="card-3d" style={{padding:16, cursor:'pointer', position:'relative'}}>
              <div style={{position:'absolute', top:8, right:8, display:'flex', gap:6}}>
                <button className="btn-circle" title="编辑" onClick={(e)=>{ e.stopPropagation(); location.href = `/projects/${p.id}` }}>✎</button>
                <button className="btn-circle" title="删除" onClick={async (e)=>{
                  e.stopPropagation();
                  if (!confirm('确定删除该项目吗？此操作不可恢复')) return;
                  const resp = await authFetch(`/api/projects/${p.id}`, { method: 'DELETE' })
                  if (resp.ok) setItems(prev=> prev.filter(x=> x.id !== p.id))
                }}>🗑</button>
              </div>
              <div style={{display:'flex', gap:12}}>
                {p.image_url && <img src={p.image_url} alt={p.title} style={{width:120, height:90, objectFit:'cover', borderRadius:8}} />}
                <div>
                  <div style={{fontWeight:800}}>{p.title}</div>
                  <div style={{color:'var(--muted)', fontSize:12}}>风格：{p.style} · 创建于 {new Date(p.created_at).toLocaleString()}</div>
                </div>
              </div>
              <div style={{marginTop:8, color:'#334155', whiteSpace:'pre-wrap'}}>
                {p.prompt_text?.slice(0, 200) || '— 无提示词 —'}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}


