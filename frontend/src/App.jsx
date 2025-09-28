import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './App.css'
// 导入所有需要的API函数
import { 
    uploadImage, 
    streamPrompt, 
    streamPromptFromUrl, 
    generateSoraImageFromImage,
    pollSoraTask,
    submit3DTask,
    poll3DTask,
    handleDownload,
    getServerUsage,
    incrementServerUsage
} from './api.js' 
import HeroCarousel from './components/HeroCarousel.jsx'
import ModalEditor from './components/ModalEditor.jsx'
import ThreeViewer from './components/ThreeViewer.jsx';
import { getToken, authFetch } from './auth.js'
import { useUsageCount, testIncrementUsage } from './hooks/useUsageCount.js'

function App() {
  const navigate = useNavigate()
  const { canUse, remaining, config, refreshUsage } = useUsageCount() // 使用实时状态管理
  // --- State for Section 1 & 2 (Prompt Generation) ---
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploaded, setUploaded] = useState(null)
  const [style, setStyle] = useState('realistic')
  const [isUploading, setIsUploading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [analysisCollected, setAnalysisCollected] = useState('')
  const [promptCollected, setPromptCollected] = useState('')
  const [showAnalysisEditor, setShowAnalysisEditor] = useState(false)
  const [showPromptEditor, setShowPromptEditor] = useState(false)
  const analysisRef = useRef(null)
  const promptRef = useRef(null)
  
  // --- State for Section 3 (Sora Image-to-Image) ---
  const [soraPrompt, setSoraPrompt] = useState('')
  const [soraImage, setSoraImage] = useState(null)
  const [isSoraGenerating, setIsSoraGenerating] = useState(false)
  const [soraResult, setSoraResult] = useState(null)
  const [soraStatus, setSoraStatus] = useState('')
  const [isDraggingSora, setIsDraggingSora] = useState(false)

  // --- State for Section 4 (3D Model) ---
  const [file3D, setFile3D] = useState(null); 
  const [isDragging3D, setIsDragging3D] = useState(false);
  const [is3DGenerating, setIs3DGenerating] = useState(false);
  const [status3D, setStatus3D] = useState('');
  const [result3D, setResult3D] = useState(null);
  const [prompt3D, setPrompt3D] = useState('');
  const [autoRotate, setAutoRotate] = useState(true);

  // --- Typewriter Effect ---
  const analysisWriter = useRef({ buffer: '', cursor: 0, timer: null })
  const promptWriter = useRef({ buffer: '', cursor: 0, timer: null })

  const startTypewriter = (writerRef, targetRef, speed = 12) => {
    const writer = writerRef.current
    if (writer.timer) return
    writer.timer = setInterval(() => {
        const { buffer, cursor } = writer
        if (cursor >= buffer.length) {
            clearInterval(writer.timer); writer.timer = null; return;
        }
        const nextChar = buffer.charAt(writer.cursor)
        writer.cursor += 1
        if (targetRef.current) targetRef.current.textContent += nextChar
    }, speed)
  }

  const enqueueText = (writerRef, targetRef, text) => {
    const writer = writerRef.current
    writer.buffer += text
    startTypewriter(writerRef, targetRef)
  }

  useEffect(() => {
    // Cleanup timers on unmount
    return () => {
        if (analysisWriter.current.timer) clearInterval(analysisWriter.current.timer)
        if (promptWriter.current.timer) clearInterval(promptWriter.current.timer)
    }
  }, [])

  // --- Computed State ---
  const canGenerate = useMemo(() => !!uploaded && !isGenerating, [uploaded, isGenerating])
  const canSave = !isGenerating && promptCollected.trim().length > 0

  // --- Event Handlers ---

  const handleFileSelect = (file) => {
    if (file) {
      setSelectedFile(file);
      setUploaded(null);
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return
    setUploaded(null)
    setIsUploading(true)
    try {
        const res = await uploadImage(selectedFile)
        setUploaded(res)
    } catch (err) {
        alert(err.message || '上传失败')
    } finally {
        setIsUploading(false)
    }
  }

  const handleGenerate = async () => {
    if (!uploaded) {
        alert('请先上传图片，再生成提示词！');
        return;
    }
    
    setIsGenerating(true)
    if (analysisRef.current) analysisRef.current.textContent = ''
    if (promptRef.current) promptRef.current.textContent = ''
    analysisWriter.current = { buffer: '', cursor: 0, timer: null }
    promptWriter.current = { buffer: '', cursor: 0, timer: null }
    setAnalysisCollected('')
    setPromptCollected('')
    try {
        await streamPrompt({
            file: selectedFile, style,
            onAnalysis: (chunk) => { enqueueText(analysisWriter, analysisRef, chunk); setAnalysisCollected(prev=>prev+chunk) },
            onPrompt: (chunk) => { enqueueText(promptWriter, promptRef, chunk); setPromptCollected(prev=>prev+chunk) },
            onDone: () => {
                setIsGenerating(false)
            }
        })
    } catch (err) {
        setIsGenerating(false)
        alert(err.message || '生成失败')
    }
  }

  const handleGenerateFromUrl = async () => {
    if (!urlInput.trim()) return
    
    setSelectedFile(null);
    setUploaded(null);
    setIsGenerating(true)
    if (analysisRef.current) analysisRef.current.textContent = ''
    if (promptRef.current) promptRef.current.textContent = ''
    analysisWriter.current = { buffer: '', cursor: 0, timer: null }
    promptWriter.current = { buffer: '', cursor: 0, timer: null }
    setAnalysisCollected('')
    setPromptCollected('')
    try {
        await streamPromptFromUrl({
            imageUrl: urlInput.trim(), style,
            onAnalysis: (chunk) => { enqueueText(analysisWriter, analysisRef, chunk); setAnalysisCollected(prev=>prev+chunk) },
            onPrompt: (chunk) => { enqueueText(promptWriter, promptRef, chunk); setPromptCollected(prev=>prev+chunk) },
            onDone: () => {
                setIsGenerating(false)
            }
        })
    } catch (err) {
        setIsGenerating(false)
        alert(err.message || '生成失败')
    }
  }

  const handleSoraGenerate = async () => {
    if (!soraPrompt.trim()) { alert('请输入 Sora 提示词！'); return; }
    if (!soraImage) { alert('请先上传图片！'); return; }
    
    if (!canUse) {
        alert('您的使用次数已用完，无法继续使用系统！');
        return;
    }
    
    setIsSoraGenerating(true); setSoraResult(null); setSoraStatus('正在提交任务...');
    try {
        const submitResult = await generateSoraImageFromImage({ 
            prompt: soraPrompt, 
            file: soraImage,
            is_async: true 
        });
        if (!submitResult.task_id) { throw new Error('API 未返回 task_id'); }
        setSoraStatus(`任务已提交 (ID: ${submitResult.task_id})，正在轮询状态...`);
        pollSoraTask({
            taskId: submitResult.task_id,
            onProgress: (status) => setSoraStatus(`轮询中... 任务状态: ${status.status}, 这可能需要几分钟... `),
            onSuccess: async (finalResult) => { 
                setSoraStatus('任务成功完成！'); 
                setSoraResult(finalResult); 
                setIsSoraGenerating(false);
                try { 
                    await incrementServerUsage({ taskId: submitResult.task_id, serviceType: 'sora' });
                    await refreshUsage(); // 等待更新完成后再刷新
                } catch (err) {
                    console.error('Failed to update usage:', err);
                    // 即使更新失败也要刷新，显示当前状态
                    await refreshUsage();
                }
            },
            onError: (error) => { setSoraStatus(`任务失败: ${error.detail || error.failure_reason || '未知错误'}`); setIsSoraGenerating(false); },
        });
    } catch (err) {
        setSoraStatus(`操作失败: ${err.message}`);
        setIsSoraGenerating(false);
    }
  };
  
  const handle3DGenerate = async () => {
    if (!file3D) { alert('请为3D模型生成选择一张图片！'); return; }
    
    if (!canUse) {
        alert('您的使用次数已用完，无法继续使用系统！');
        return;
    }
    
    setIs3DGenerating(true); setResult3D(null); setStatus3D('正在提交3D生成任务...');
    try {
        const { task_id } = await submit3DTask(file3D, prompt3D);
        if (!task_id) throw new Error('API did not return a task_id');
        setStatus3D(`任务已提交 (ID: ${task_id})，正在处理... (这可能需要几分钟)`);
        poll3DTask({
            taskId: task_id,
            onProgress: (status) => setStatus3D(`处理中... 状态: ${status.status}, 进度: 这可能需要几分钟... `),
            onSuccess: async (finalResult) => { 
                setStatus3D('3D模型生成成功！'); 
                setResult3D(finalResult); 
                setIs3DGenerating(false);
                try { 
                    await incrementServerUsage({ taskId: task_id, serviceType: 'tripo' });
                    await refreshUsage(); // 等待更新完成后再刷新
                } catch (err) {
                    console.error('Failed to update usage:', err);
                    // 即使更新失败也要刷新，显示当前状态
                    await refreshUsage();
                }
            },
            onError: (error) => { setStatus3D(`任务失败: ${error.detail || error.message || '未知错误'}`); setIs3DGenerating(false); }
        });
    } catch (err) {
        setStatus3D(`操作失败: ${err.message}`);
        setIs3DGenerating(false);
    }
  };
  
  const handleSave = async () => {
    const title = prompt('为当前项目输入一个标题：', new Date().toLocaleString()); if (!title) return;
    try {
        const token = getToken();
        if (!token) { alert('请先登录后再保存到历史'); navigate('/login'); return; }
        const resp = await authFetch('/api/projects', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, style, image_url: uploaded?.url || null, analysis_text: analysisCollected, prompt_text: promptCollected })
        });
        if (!resp.ok) throw new Error(await resp.text() || '保存失败');
        await resp.json(); alert('保存成功');
    } catch (e) {
        alert(e.message || '保存失败');
    }
  };

  async function urlToFile(url, filename, mimeType){
    const res = await fetch(url);
    const blob = await res.blob();
    return new File([blob], filename, { type: mimeType });
  }

  const handleDragStart = (event, imageUrl) => {
    event.dataTransfer.setData("text/uri-list", imageUrl);
    event.dataTransfer.setData("text/plain", imageUrl);
  };
  
  return (
    <div className="container">
      <HeroCarousel />
      <div className="hero">
        <div>
          <div className="title hero-title">FORMU <span className="accent" style={{color:'var(--wood-dark)'}}>为记忆, 造实体</span> </div>
          <div className="hero-sub">上传参考图片 → 实时分析 → 生成对应风格的高质量提示词</div>
        </div>
        <div className="badge">Beta</div>
      </div>
      
      {/* 使用次数实时显示 */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '20px'
      }}>
        <div style={{
          padding: '12px 24px',
          backgroundColor: `${config.color}15`,
          borderRadius: '8px',
          border: `1px solid ${config.color}30`,
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: config.color
          }} />
          <span style={{
            fontSize: '14px',
            fontWeight: '600',
            color: config.color
          }}>
            {config.name}
          </span>
          <span style={{
            fontSize: '14px',
            color: '#6b7280'
          }}>
            剩余: {remaining === Infinity ? '∞' : remaining}
          </span>
          {/* 测试按钮 - 仅用于开发测试 */}
          {process.env.NODE_ENV === 'development' && (
            <button 
              onClick={testIncrementUsage}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              测试+1
            </button>
          )}
        </div>
      </div>
      
      <div className="subtle-sep"></div>

      <section className="beautified-card">
        <h2 className="card-title">1. 上传图片 (用于生成提示词)</h2>
        <div className="row">
          <div style={{flex: 1.2}}>
            <form onSubmit={handleUpload} id="uploadForm">
              <div className={`dropzone ${isDragging ? 'dragging' : ''}`} onDragOver={(e)=>{ e.preventDefault(); setIsDragging(true) }} onDragLeave={()=> setIsDragging(false)} onDrop={(e)=>{ e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files?.[0]; if (file) handleFileSelect(file); }} onClick={()=> document.getElementById('file-input')?.click()}>
                <div className="icon">⇪</div>
                <div className="hint">拖拽图片到此处</div>
                <div className="sub">或点击以选择文件</div>
                <input id="file-input" style={{display:'none'}} type="file" accept="image/*" onChange={(e) => handleFileSelect(e.target.files?.[0] || null)} />
              </div>
              <div className="controls" style={{marginTop:10}}>
                <button className="btn-primary" type="submit" disabled={!selectedFile || isUploading || uploaded}>
                  {uploaded ? '上传成功' : (isUploading ? '上传中...' : '确认上传')}
                </button>
              </div>
              {isUploading && <div className="progress" style={{marginTop: '10px'}} />}
              <div className="controls" style={{marginTop:10}}>
                <input className="input-box" type="url" placeholder="或输入网络图片链接" value={urlInput} onChange={e=> setUrlInput(e.target.value)} />
              </div>
            </form>
          </div>
          <div style={{flex: 0.8, paddingLeft: '24px'}}>
            <div className="preview-container">
              {selectedFile ? 
                (<img src={URL.createObjectURL(selectedFile)} alt="preview for prompt generation" />) :
                (<span style={{color: '#999', fontSize: '0.9rem'}}>图片预览区</span>)
              }
            </div>
          </div>
        </div>
      </section>

      <div className="subtle-sep"></div>

      <section className="beautified-card">
        <h2 className="card-title">2. 生成提示词</h2>
        <div className="controls">
          <label>选择风格：<select value={style} onChange={(e) => setStyle(e.target.value)}><option value="realistic">逼真 realistic</option><option value="cute">可爱 cute</option><option value="cyberpunk">赛博朋克 cyberpunk</option><option value="american_comic">美漫 american_comic</option><option value="japanese_comic">日漫 japanese_comic</option><option value="steampunk">蒸汽朋克 steampunk</option><option value="profession">职业 profession</option><option value="gothic">哥特 gothic</option></select></label>
          <button className="btn-primary" id="generateBtn" onClick={handleGenerate} disabled={!canGenerate}>{isGenerating ? '生成中…' : '开始生成'}</button>
          <button className="btn-primary" onClick={handleSave} disabled={!canSave}>保存到历史</button>
        </div>
        {isGenerating && <div className="progress"/>}
        <div className="outputs"><div className="output-box"><div className="output-header" style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <span>图片分析</span><button className="btn-circle" title="全屏编辑" onClick={()=> setShowAnalysisEditor(true)}>✎</button></div><div id="analysisOutput" className="output-display" ref={analysisRef}></div></div><div className="output-box"><div className="output-header" style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <span>提示词</span><button className="btn-circle" title="全屏编辑" onClick={()=> setShowPromptEditor(true)}>✎</button></div><div id="promptOutput" className="output-display" ref={promptRef}></div></div>
        </div>
      </section>

      <div className="subtle-sep"></div>
      
      <section className="panel card-3d">
        <h2 style={{margin:"4px 0 12px", color:'var(--wood-dark)'}}>3. Sora 图生图</h2>
        <div className="row">
          <div style={{flex: 1}}>
            <div className={`dropzone ${isDraggingSora ? 'dragging' : ''}`} 
                 onDragOver={(e)=>{ e.preventDefault(); setIsDraggingSora(true) }} 
                 onDragLeave={()=> setIsDraggingSora(false)} 
                 onDrop={(e)=>{ e.preventDefault(); setIsDraggingSora(false); const file = e.dataTransfer.files?.[0]; if (file) setSoraImage(file); }} 
                 onClick={()=> document.getElementById('sora-file-input')?.click()}>
              <div className="icon">⇪</div>
              <div className="hint">拖拽图片到此处</div>
              <div className="sub">或点击以选择文件</div>
              <input id="sora-file-input" style={{display:'none'}} type="file" accept="image/*" onChange={(e) => setSoraImage(e.target.files?.[0] || null)} />
            </div>
            <div className="preview">
              {soraImage ? (
                <img src={URL.createObjectURL(soraImage)} alt="Sora input preview" />
              ) : (
                <span style={{color: '#999', fontSize: '0.9rem'}}>图片预览区</span>
              )}
            </div>
            {soraImage && (
              <div className="controls" style={{marginTop: 10, justifyContent: 'center'}}>
                <button className="btn-secondary" onClick={() => setSoraImage(null)} style={{fontSize: '12px', padding: '4px 8px'}}>
                  清除图片
                </button>
              </div>
            )}
          </div>
          <div style={{flex: 2, paddingLeft: '20px'}}>
            <label htmlFor="sora-prompt">提示词:</label>
            <textarea
                id="sora-prompt"
                className="input-box"
                style={{minHeight: '80px', width: '100%', boxSizing: 'border-box'}}
                placeholder="输入描述或关键词来指导图片生成..."
                value={soraPrompt}
                onChange={(e) => setSoraPrompt(e.target.value)}
            />
            <div className="controls" style={{marginTop: 20, justifyContent: 'flex-start'}}>
                <button className="btn-primary" onClick={handleSoraGenerate} disabled={!soraPrompt.trim() || !soraImage || isSoraGenerating}>
                    {isSoraGenerating ? '生成中...' : '开始生成 (Sora 图生图)'}
                </button>
            </div>
          </div>
        </div>
        
        {isSoraGenerating && (
            <>
              <div className="upload-status" style={{marginTop: 15}}>{soraStatus}</div>
              <div className="progress" style={{marginTop: '10px'}}></div>
            </>
        )}

        {soraResult && soraResult.data && (<div className="outputs" style={{marginTop: 20}}><h3>生成结果</h3>{soraResult.data.map((image, index) => { const imageUrl = image.url || `data:image/png;base64,${image.b64_json}`; const filename = `sora-generated-${Date.now()}-${index + 1}.png`; return (<div key={index} className="result-item" style={{ marginBottom: '20px' }}><div className="preview"><img src={imageUrl} alt={`Generated image ${index + 1}`} draggable="true" onDragStart={(e) => handleDragStart(e, imageUrl)} style={{cursor: 'grab'}} /></div><div className="controls" style={{ marginTop: '10px', justifyContent: 'center' }}><button className="btn-primary" onClick={() => handleDownload(imageUrl, filename)}>下载图片</button></div></div>);})}</div>)}
      </section>

      <div className="subtle-sep"></div>
      
      <section className="panel card-3d">
        <h2 style={{margin:"4px 0 12px", color:'var(--wood-dark)'}}>4. 3D模型生成</h2>
        <div className="row">
            <div style={{flex: 1}}>
                <div className={`dropzone ${isDragging3D ? 'dragging' : ''}`} onDragOver={(e)=>{ e.preventDefault(); setIsDragging3D(true) }} onDragLeave={()=> setIsDragging3D(false)} onDrop={async (e) => { e.preventDefault(); setIsDragging3D(false); const imageUrl = e.dataTransfer.getData("text/uri-list"); if (imageUrl) { setStatus3D('正在处理拖拽的图片...'); try { const file = await urlToFile(imageUrl, `sora-dnd-${Date.now()}.png`, 'image/png'); setFile3D(file); setStatus3D(''); } catch (err) { setStatus3D('处理图片失败！'); console.error(err); } } else { const file = e.dataTransfer.files?.[0]; if (file) setFile3D(file); } }} onClick={()=> document.getElementById('file-input-3d')?.click()}>
                    <div className="icon">⇪</div>
                    <div className="hint">拖拽图片到此处</div>
                    <div className="sub">或点击以选择文件</div>
                    <input id="file-input-3d" style={{display:'none'}} type="file" accept="image/*" onChange={(e) => setFile3D(e.target.files?.[0] || null)} />
                </div>
                <div className="preview">{file3D && (<img src={URL.createObjectURL(file3D)} alt="3D input preview" />)}</div>
            </div>
            <div style={{flex: 2, paddingLeft: '20px'}}>
                <label htmlFor="prompt-3d">附加提示词 (Optional Prompt):</label>
                <textarea
                    id="prompt-3d"
                    className="input-box"
                    style={{minHeight: '80px', width: '100%', boxSizing: 'border-box'}}
                    placeholder="输入描述或关键词可以提高模型质量..."
                    value={prompt3D}
                    onChange={(e) => setPrompt3D(e.target.value)}
                />
                <div className="controls" style={{marginTop: 20, justifyContent: 'flex-start'}}>
                    <button className="btn-primary" onClick={handle3DGenerate} disabled={!file3D || is3DGenerating}>
                        {is3DGenerating ? '3D模型生成中...' : '开始生成3D模型'}
                    </button>
                </div>
            </div>
        </div>

        {is3DGenerating && (
            <>
              <div className="upload-status" style={{marginTop: 15, width: '100%'}}>{status3D}</div>
              <div className="progress" style={{marginTop: '10px'}}></div>
            </>
        )}

        {result3D && (result3D.model_url || result3D.preview_url) && (
          <div className="outputs" style={{ marginTop: 20 }}>
            <h3>3D模型结果</h3>

            {/* three.js 实时预览（优先使用可下载的 glb 链接） */}
            {result3D.model_url ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={autoRotate}
                      onChange={(e) => setAutoRotate(e.target.checked)}
                    />
                    自动旋转
                  </label>
                </div>
                <ThreeViewer modelUrl={result3D.model_url} autoRotate={autoRotate} />
              </>
            ) : (
              // 若暂时只有图片预览（无 glb 下载链接），仍显示图片
              <div className="preview">
                <img src={result3D.preview_url} alt="3D Model Preview" />
              </div>
            )}

            <div className="controls" style={{ marginTop: 10, justifyContent: 'center' }}>
              {result3D.model_url && (
                <a
                  href={result3D.model_url}
                  download={`formu-3d-model-${Date.now()}.glb`}
                  className="btn-primary"
                >
                  下载模型 (.glb)
                </a>
              )}
            </div>
          </div>
        )}

      </section>

      <ModalEditor open={showAnalysisEditor} title="图片分析" value={analysisCollected} onChange={setAnalysisCollected} onClose={()=> setShowAnalysisEditor(false)} onApply={()=> setShowAnalysisEditor(false)} />
      <ModalEditor open={showPromptEditor} title="提示词" value={promptCollected} onChange={setPromptCollected} onClose={()=> setShowPromptEditor(false)} onApply={()=> setShowPromptEditor(false)} />
    </div>
  )
}

export default App;

