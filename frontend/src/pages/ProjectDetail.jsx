import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { authFetch } from '../auth.js'

export default function ProjectDetail() {
  const { id } = useParams()
  const [project, setProject] = useState(null)

  useEffect(() => {
    (async () => {
      const resp = await authFetch(`/api/projects/${id}`)
      const data = await resp.json()
      setProject(data)
    })()
  }, [id])

  if (!project) return <div className="spinner" />

  return (
    <div>
      <div className="hero" style={{marginTop:0}}>
        <div className="title hero-title">{project.title}</div>
      </div>
      <div className="subtle-sep" />

      <div className="panel card-3d" style={{padding:16}}>
        <div style={{display:'flex', gap:16}}>
          {project.image_url && (
            <img src={project.image_url} alt={project.title} style={{width:260, height:200, objectFit:'cover', borderRadius:12}} />
          )}
          <div style={{flex:1}}>
            <div style={{color:'var(--muted)'}}>风格：
              <input value={project.style} onChange={e=> setProject({...project, style: e.target.value})} style={{marginLeft:8}} />
            </div>
            <div style={{color:'var(--muted)'}}>创建时间：{new Date(project.created_at).toLocaleString()}</div>
          </div>
        </div>

        <div className="outputs" style={{marginTop:16}}>
          <div className="output-box">
            <div className="output-header">图片分析（analysis）</div>
            <textarea className="output" style={{whiteSpace:'pre-wrap'}} value={project.analysis_text || ''} onChange={e=> setProject({...project, analysis_text: e.target.value})} />
          </div>
          <div className="output-box">
            <div className="output-header">提示词（prompt）</div>
            <textarea className="output" style={{whiteSpace:'pre-wrap'}} value={project.prompt_text || ''} onChange={e=> setProject({...project, prompt_text: e.target.value})} />
          </div>
        </div>
        <div className="controls" style={{justifyContent:'flex-end', marginTop:12}}>
          <button className="btn-primary" onClick={async ()=>{
            const payload = {
              title: project.title,
              style: project.style,
              image_url: project.image_url,
              analysis_text: project.analysis_text,
              prompt_text: project.prompt_text,
            }
            const resp = await authFetch(`/api/projects/${project.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            if (resp.ok) alert('已保存修改')
          }}>保存修改</button>
        </div>
      </div>
    </div>
  )
}


