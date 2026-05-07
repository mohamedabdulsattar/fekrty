import { useState, useEffect, useRef, useCallback } from "react";

const LS = "fekrty_v4";
const loadLS = () => { try { const d = localStorage.getItem(LS); return d ? JSON.parse(d) : {}; } catch { return {}; } };
const saveLS = (d) => { try { localStorage.setItem(LS, JSON.stringify(d)); } catch {} };

const COLORS = [
  ["#FF6B6B","#FF8E53"],["#A855F7","#EC4899"],["#06B6D4","#3B82F6"],
  ["#10B981","#059669"],["#F59E0B","#F97316"],["#EF4444","#F43F5E"],
  ["#8B5CF6","#6366F1"],["#14B8A6","#06B6D4"],["#FB923C","#FBBF24"],
  ["#E879F9","#A855F7"],["#22D3EE","#6EE7B7"],["#FCD34D","#FB923C"],
];
const EMOJIS = ["💡","🚀","⭐","🎯","🔮","🌟","💎","🎨","🔥","🌈","✨","🦋"];
const QUOTES = [
  "💡 كل فكرة عظيمة بدأت بخطوة صغيرة",
  "🚀 ابدأ صغيراً وفكّر كبيراً",
  "🌟 الإبداع لا حدود له",
  "🎯 ركّز، نظّم، أنجز!",
  "✨ أفكارك هي بذور النجاح",
  "🔥 اليوم هو أفضل وقت للبدء",
];
const PAGE_STYLES = [
  { id:"paper",    label:"📄 ورق أصفر", bg:"#fdf6e3", line:"#e8d5a3", dark:false },
  { id:"white",    label:"📃 أبيض نقي", bg:"#ffffff", line:"#dde3ff", dark:false },
  { id:"mint",     label:"🌿 نعناعي",   bg:"#f0fff4", line:"#a8e6cf", dark:false },
  { id:"lavender", label:"💜 لافندر",   bg:"#f5f0ff", line:"#c9b1ff", dark:false },
  { id:"sunset",   label:"🌅 غروب",     bg:"#fff8f0", line:"#ffcc99", dark:false },
  { id:"dark",     label:"🌙 ليلي",     bg:"#0f0f1a", line:"#ffffff12",dark:true  },
];
const NODE_TYPES = {
  urgent:    { label:"🔥 عاجل",     color:"#FF6B6B", bg:"#fff0f0" },
  noturgent: { label:"✅ غير عاجل", color:"#10B981", bg:"#f0fff8" },
  do:        { label:"⚡ افعل",     color:"#3B82F6", bg:"#f0f4ff" },
  delegate:  { label:"👥 تفويض",   color:"#A855F7", bg:"#f8f0ff" },
  postpone:  { label:"⏳ تأجيل",   color:"#F59E0B", bg:"#fffbf0" },
};

const uid = () => Math.random().toString(36).slice(2,8);
const fmtDT = (v) => { try { return new Date(v).toLocaleString("ar-EG",{dateStyle:"short",timeStyle:"short"}); } catch { return v; } };

export default function Fekrty() {
  const [screen, setScreen]         = useState("splash");
  const [cards, setCards]           = useState([]);
  const [nodes, setNodes]           = useState({});
  const [pageStyle, setPageStyle]   = useState(PAGE_STYLES[0]);
  const [quoteIdx, setQuoteIdx]     = useState(0);
  const [toast, setToast]           = useState("");
  const [activeNode, setActiveNode] = useState(null);
  const [taskInput, setTaskInput]   = useState("");
  const [dtInput, setDtInput]       = useState("");
  const [menuOpen, setMenuOpen]     = useState(false);
  const [styleOpen, setStyleOpen]   = useState(false);

  const dragRef   = useRef(null);   // { kind, id, cardId?, ox, oy }
  const cardsRef  = useRef(cards);
  const nodesRef  = useRef(nodes);
  const psRef     = useRef(pageStyle);
  const canvasRef = useRef(null);

  // keep refs in sync
  useEffect(() => { cardsRef.current = cards; }, [cards]);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { psRef.current = pageStyle; }, [pageStyle]);

  // boot
  useEffect(() => {
    const d = loadLS();
    if (d.cards)   setCards(d.cards);
    if (d.nodes)   setNodes(d.nodes);
    if (d.styleId) { const ps = PAGE_STYLES.find(p=>p.id===d.styleId); if(ps) setPageStyle(ps); }
  }, []);

  // autosave
  useEffect(() => { saveLS({ cards, nodes, styleId:pageStyle.id }); }, [cards, nodes, pageStyle]);

  // quote
  useEffect(() => {
    const t = setInterval(()=>setQuoteIdx(i=>(i+1)%QUOTES.length), 3500);
    return ()=>clearInterval(t);
  }, []);

  const toast$ = (msg) => { setToast(msg); setTimeout(()=>setToast(""),2400); };

  /* ─── CARD ops ─── */
  const addCard = useCallback(() => {
    setCards(prev => {
      if (prev.length >= 30) return prev;
      const idx = prev.length;
      const [c1,c2] = COLORS[idx % COLORS.length];
      return [...prev, {
        id:uid(), title:"فكرة جديدة",
        emoji:EMOJIS[idx%EMOJIS.length],
        x: 60 + Math.random()*280,
        y: 70 + Math.random()*200,
        c1, c2,
      }];
    });
    setMenuOpen(false);
    setScreen("canvas");
  }, []);

  const updateTitle = (id, title) =>
    setCards(prev => prev.map(c => c.id===id ? {...c,title} : c));

  const deleteCard = (cardId) => {
    setCards(prev => prev.filter(c=>c.id!==cardId));
    setNodes(prev => { const n={...prev}; delete n[cardId]; return n; });
    setActiveNode(null);
    toast$("تم الحذف");
  };

  /* ─── NODE ops ─── */
  const addNode = (cardId, type) => {
    const card = cardsRef.current.find(c=>c.id===cardId);
    if (!card) return;
    const existing = nodesRef.current[cardId] || [];
    const already = existing.find(n=>n.type===type);
    if (already) {
      setActiveNode({cardId, nodeId:already.id});
      setDtInput(already.dt||"");
      return;
    }
    const angle = (-Math.PI/2) + existing.length * 0.9;
    const newNode = {
      id:uid(), type,
      x: card.x + 170*Math.cos(angle),
      y: card.y + 170*Math.sin(angle),
      tasks:[], dt:"",
    };
    setNodes(prev => ({...prev, [cardId]:[...(prev[cardId]||[]), newNode]}));
    setActiveNode({cardId, nodeId:newNode.id});
    setDtInput("");
  };

  const getNode = (cardId, nodeId) => (nodesRef.current[cardId]||[]).find(n=>n.id===nodeId);

  const patchNode = (cardId, nodeId, patch) =>
    setNodes(prev => ({
      ...prev,
      [cardId]: (prev[cardId]||[]).map(n=>n.id===nodeId ? {...n,...patch} : n),
    }));

  const addTask = () => {
    if (!activeNode || !taskInput.trim()) return;
    const {cardId,nodeId} = activeNode;
    const node = getNode(cardId,nodeId);
    if (!node) return;
    patchNode(cardId,nodeId,{tasks:[...(node.tasks||[]),{id:uid(),text:taskInput.trim(),done:false}]});
    setTaskInput("");
  };

  const toggleTask = (cardId,nodeId,tid) => {
    const node = getNode(cardId,nodeId);
    if (!node) return;
    patchNode(cardId,nodeId,{tasks:node.tasks.map(t=>t.id===tid?{...t,done:!t.done}:t)});
  };

  const deleteTask = (cardId,nodeId,tid) => {
    const node = getNode(cardId,nodeId);
    if (!node) return;
    patchNode(cardId,nodeId,{tasks:node.tasks.filter(t=>t.id!==tid)});
  };

  const saveDT = () => {
    if (!activeNode) return;
    patchNode(activeNode.cardId, activeNode.nodeId, {dt:dtInput});
    toast$("📅 تم حفظ الموعد");
  };

  /* ─── DRAG via pointer events ─── */
  const onPointerDown = useCallback((e, kind, id, extra={}) => {
    if (["INPUT","BUTTON"].includes(e.target.tagName)) return;
    e.preventDefault();
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    if (kind==="card") {
      const card = cardsRef.current.find(c=>c.id===id);
      if (!card) return;
      dragRef.current = { kind:"card", id, ox:cx-card.x, oy:cy-card.y };
    } else {
      const {cardId} = extra;
      const node = (nodesRef.current[cardId]||[]).find(n=>n.id===id);
      if (!node) return;
      dragRef.current = { kind:"node", id, cardId, ox:cx-node.x, oy:cy-node.y };
    }
    canvas.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e) => {
    const dr = dragRef.current;
    if (!dr) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const nx = Math.max(0, Math.min(cx - dr.ox, rect.width  - 190));
    const ny = Math.max(0, Math.min(cy - dr.oy, rect.height - 130));

    if (dr.kind==="card") {
      setCards(prev => prev.map(c => c.id===dr.id ? {...c,x:nx,y:ny} : c));
    } else {
      setNodes(prev => ({
        ...prev,
        [dr.cardId]: (prev[dr.cardId]||[]).map(n=>n.id===dr.id?{...n,x:nx,y:ny}:n),
      }));
    }
  }, []);

  const onPointerUp = useCallback(() => { dragRef.current = null; }, []);

  /* ─── Lines ─── */
  const lines = [];
  cards.forEach(card => {
    (nodes[card.id]||[]).forEach(node => {
      const info = NODE_TYPES[node.type];
      lines.push({ x1:card.x+76, y1:card.y+40, x2:node.x+59, y2:node.y+25, color:info?.color||"#aaa" });
    });
  });

  /* ─── Active node ─── */
  const anData = activeNode ? (nodes[activeNode.cardId]||[]).find(n=>n.id===activeNode.nodeId) : null;
  const anType = anData ? NODE_TYPES[anData.type] : null;
  const anCard = activeNode ? cards.find(c=>c.id===activeNode.cardId) : null;

  /* ════ SPLASH ════ */
  if (screen==="splash") return (
    <div style={{width:"100%",height:600,background:"linear-gradient(135deg,#FC5C7D,#6A3DE8,#00C9FF)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"Tajawal,sans-serif",direction:"rtl",position:"relative",overflow:"hidden"}}>
      {[...Array(5)].map((_,i)=>(
        <div key={i} style={{position:"absolute",borderRadius:"50%",background:"rgba(255,255,255,0.07)",width:80+i*60,height:80+i*60,top:`${8+i*12}%`,left:`${i%2===0?-5:65}%`}}/>
      ))}
      <div style={{fontSize:62,fontWeight:900,color:"#fff",textShadow:"0 4px 24px rgba(0,0,0,.2)",marginBottom:10,letterSpacing:-2}}>✨ فكرتى</div>
      <div style={{fontSize:17,color:"rgba(255,255,255,.9)",marginBottom:6}}>{QUOTES[quoteIdx]}</div>
      <div style={{fontSize:13,color:"rgba(255,255,255,.55)",marginBottom:44}}>نظّم أفكارك · حقّق أهدافك · فكّك المهام</div>
      <button style={{background:"#fff",color:"#FC5C7D",border:"none",padding:"14px 56px",borderRadius:50,fontFamily:"Tajawal,sans-serif",fontSize:18,fontWeight:700,cursor:"pointer",boxShadow:"0 8px 32px rgba(0,0,0,.18)"}}
        onClick={()=>setScreen("home")}>ابدأ التفكير ! 🚀</button>
    </div>
  );

  /* ════ HOME ════ */
  if (screen==="home") return (
    <div style={{width:"100%",height:600,background:"linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)",fontFamily:"Tajawal,sans-serif",direction:"rtl",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden"}}>
      {[...Array(6)].map((_,i)=>(
        <div key={i} style={{position:"absolute",borderRadius:"50%",background:"rgba(255,255,255,0.04)",width:60+i*55,height:60+i*55,top:`${i*14}%`,left:`${i%3*33}%`}}/>
      ))}
      <div style={{background:"rgba(255,255,255,.07)",borderRadius:20,padding:"20px 32px",marginBottom:28,textAlign:"center",border:"1px solid rgba(255,255,255,.1)"}}>
        <div style={{fontSize:30,marginBottom:8}}>✨</div>
        <div style={{fontSize:17,color:"#fff",fontWeight:700,marginBottom:4}}>{QUOTES[quoteIdx]}</div>
        <div style={{fontSize:12,color:"rgba(255,255,255,.4)"}}>فكرتى · منظّم الأفكار الذكي</div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12,width:280}}>
        <button style={{background:"linear-gradient(135deg,#FC5C7D,#F093FB)",color:"#fff",border:"none",padding:"14px 24px",borderRadius:16,fontFamily:"Tajawal,sans-serif",fontSize:16,fontWeight:700,cursor:"pointer",boxShadow:"0 6px 24px rgba(252,92,125,.4)"}}
          onClick={addCard}>➕ إضافة مشروع / فكرة جديدة</button>
        <button style={{background:"linear-gradient(135deg,#667EEA,#764BA2)",color:"#fff",border:"none",padding:"14px 24px",borderRadius:16,fontFamily:"Tajawal,sans-serif",fontSize:16,fontWeight:700,cursor:"pointer",boxShadow:"0 6px 24px rgba(102,126,234,.4)"}}
          onClick={()=>setScreen("canvas")}>🗺️ فتح لوحة الأفكار</button>
      </div>
      {cards.length>0 && (
        <div style={{marginTop:22,background:"rgba(255,255,255,.05)",borderRadius:16,padding:"14px 18px",width:280,maxHeight:150,overflowY:"auto",border:"1px solid rgba(255,255,255,.08)"}}>
          <div style={{fontSize:11,color:"rgba(255,255,255,.3)",marginBottom:8}}>المشروعات المحفوظة ({cards.length})</div>
          {cards.map(c=>(
            <div key={c.id} onClick={()=>setScreen("canvas")} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",cursor:"pointer",borderBottom:"1px solid rgba(255,255,255,.06)",color:"rgba(255,255,255,.8)",fontSize:13}}>
              <div style={{width:8,height:8,borderRadius:2,background:c.c1,flexShrink:0}}/>
              <span>{c.emoji} {c.title}</span>
              {(nodes[c.id]||[]).find(n=>n.type==="urgent")&&<span style={{marginRight:"auto",fontSize:11}}>🔥</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  /* ════ CANVAS ════ */
  return (
    <div
      ref={canvasRef}
      style={{
        width:"100%", height:600, position:"relative", overflow:"hidden",
        fontFamily:"Tajawal,sans-serif", direction:"rtl",
        background: pageStyle.bg,
        backgroundImage:`repeating-linear-gradient(0deg,transparent,transparent 29px,${pageStyle.line} 30px),repeating-linear-gradient(90deg,transparent,transparent 29px,${pageStyle.line} 30px)`,
        touchAction:"none", userSelect:"none",
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={(e)=>{
        if(e.target===canvasRef.current||e.target.tagName==="svg"||["line","circle","svg"].includes(e.target.tagName)){
          setActiveNode(null); setMenuOpen(false); setStyleOpen(false);
        }
      }}
    >
      {/* SVG lines */}
      <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:1}}>
        {lines.map((l,i)=>(
          <g key={i}>
            <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.color} strokeWidth="2.5" strokeDasharray="7 4" opacity=".65"/>
            <circle cx={l.x2} cy={l.y2} r="5" fill={l.color} opacity=".9"/>
          </g>
        ))}
      </svg>

      {/* Toolbar */}
      <div style={{position:"absolute",top:12,right:12,display:"flex",gap:8,zIndex:200,flexWrap:"wrap"}}>
        {/* فكرتى */}
        <div style={{position:"relative"}}>
          <button onClick={e=>{e.stopPropagation();setMenuOpen(p=>!p);setStyleOpen(false);setActiveNode(null);}}
            style={{background:"linear-gradient(135deg,#FC5C7D,#6A3DE8)",color:"#fff",border:"none",padding:"9px 18px",borderRadius:14,fontFamily:"Tajawal,sans-serif",fontSize:13,fontWeight:900,cursor:"pointer",boxShadow:"0 4px 18px rgba(252,92,125,.35)"}}>
            ✨ فكرتى
          </button>
          {menuOpen&&(
            <div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:44,right:0,background:"#fff",borderRadius:18,boxShadow:"0 12px 50px rgba(0,0,0,.18)",padding:12,minWidth:230,zIndex:500}}>
              <div style={{fontSize:11,color:"#aaa",padding:"2px 8px 8px",borderBottom:"1px solid #f0f0f0",marginBottom:6}}>القائمة الرئيسية</div>
              <Mitem icon="🏠" label="الصفحة الرئيسية" onClick={()=>{setScreen("home");setMenuOpen(false);}}/>
              <Mitem icon="➕" label="إضافة فكرة جديدة" onClick={addCard}/>
              {cards.length>0&&<>
                <div style={{margin:"6px 0",borderTop:"1px solid #f0f0f0"}}/>
                <div style={{fontSize:11,color:"#aaa",padding:"4px 10px 6px"}}>المشروعات ({cards.length})</div>
                {cards.map(c=>(
                  <div key={c.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:10,cursor:"pointer",fontSize:13,color:"#333"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#f5f5f5"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                    onClick={()=>setMenuOpen(false)}>
                    <div style={{width:8,height:8,borderRadius:2,background:c.c1,flexShrink:0}}/>
                    <span style={{flex:1}}>{c.emoji} {c.title}</span>
                    <button onClick={e=>{e.stopPropagation();deleteCard(c.id);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:"#ccc",padding:0}}>🗑</button>
                  </div>
                ))}
              </>}
            </div>
          )}
        </div>
        {/* استايل */}
        <div style={{position:"relative"}}>
          <button onClick={e=>{e.stopPropagation();setStyleOpen(p=>!p);setMenuOpen(false);setActiveNode(null);}}
            style={{background:"linear-gradient(135deg,#4FACFE,#00F2FE)",color:"#fff",border:"none",padding:"9px 16px",borderRadius:14,fontFamily:"Tajawal,sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(79,172,254,.35)"}}>
            🎨 استايل
          </button>
          {styleOpen&&(
            <div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:44,left:0,background:"#fff",borderRadius:18,boxShadow:"0 12px 50px rgba(0,0,0,.18)",padding:14,zIndex:500,minWidth:270}}>
              <div style={{fontSize:13,fontWeight:700,color:"#333",marginBottom:10,textAlign:"center"}}>🎨 اختر استايل الصفحة</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                {PAGE_STYLES.map(ps=>(
                  <div key={ps.id} onClick={()=>{setPageStyle(ps);setStyleOpen(false);toast$("🎨 تم التغيير");}}
                    style={{background:ps.bg,border:`2.5px solid ${pageStyle.id===ps.id?"#6A3DE8":"#e5e5e5"}`,borderRadius:12,padding:"10px 6px",cursor:"pointer",textAlign:"center",fontSize:11,fontWeight:700,color:ps.dark?"#fff":"#555",transform:pageStyle.id===ps.id?"scale(1.06)":"scale(1)",transition:".18s"}}>
                    {ps.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cards + Nodes */}
      {cards.map(card=>{
        const cardNodes = nodes[card.id]||[];
        const isCardDragging = dragRef.current?.kind==="card" && dragRef.current?.id===card.id;
        return (
          <div key={card.id}>
            {/* Card */}
            <div
              onPointerDown={e=>onPointerDown(e,"card",card.id)}
              style={{
                position:"absolute",left:card.x,top:card.y,
                minWidth:150,maxWidth:192,
                background:`linear-gradient(135deg,${card.c1},${card.c2})`,
                borderRadius:20,padding:"12px 14px",
                cursor:"grab",
                zIndex:10,
                boxShadow:"0 8px 28px rgba(0,0,0,.18)",
                userSelect:"none",touchAction:"none",
              }}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                <span style={{fontSize:20}}>{card.emoji}</span>
                <input value={card.title} onChange={e=>updateTitle(card.id,e.target.value)}
                  onBlur={()=>saveLS({cards,nodes,styleId:pageStyle.id})}
                  onClick={e=>e.stopPropagation()}
                  style={{background:"transparent",border:"none",outline:"none",color:"#fff",fontFamily:"Tajawal,sans-serif",fontSize:14,fontWeight:700,flex:1,minWidth:0,textShadow:"0 1px 4px rgba(0,0,0,.2)"}}/>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {Object.entries(NODE_TYPES).map(([type,info])=>(
                  <button key={type} onClick={e=>{e.stopPropagation();addNode(card.id,type);}}
                    style={{background:"rgba(255,255,255,.22)",border:"none",borderRadius:20,padding:"3px 9px",fontSize:11,fontWeight:700,color:"#fff",cursor:"pointer"}}>
                    {info.label}
                  </button>
                ))}
                <button onClick={e=>{e.stopPropagation();deleteCard(card.id);}}
                  style={{background:"rgba(255,80,80,.3)",border:"none",borderRadius:20,padding:"3px 9px",fontSize:11,fontWeight:700,color:"#fff",cursor:"pointer"}}>
                  🗑️
                </button>
              </div>
              {cardNodes.length>0&&(
                <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:6}}>
                  {cardNodes.map(n=>(
                    <span key={n.id} style={{background:"rgba(255,255,255,.28)",borderRadius:20,padding:"2px 8px",fontSize:10,color:"#fff",fontWeight:700}}>
                      {NODE_TYPES[n.type]?.label}{(n.tasks||[]).length>0?` (${n.tasks.length})`:""}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Nodes */}
            {cardNodes.map(node=>{
              const info=NODE_TYPES[node.type];
              const isAct=activeNode?.nodeId===node.id;
              const isNDrag=dragRef.current?.kind==="node"&&dragRef.current?.id===node.id;
              return (
                <div key={node.id}
                  onPointerDown={e=>onPointerDown(e,"node",node.id,{cardId:card.id})}
                  onClick={e=>{e.stopPropagation();setActiveNode({cardId:card.id,nodeId:node.id});setDtInput(node.dt||"");}}
                  style={{
                    position:"absolute",left:node.x,top:node.y,
                    width:120,background:info.bg,
                    borderRadius:16,padding:"10px 12px",
                    cursor:"grab",
                    zIndex:15,
                    boxShadow:isAct?`0 0 0 3px ${info.color},0 8px 28px rgba(0,0,0,.15)`:"0 6px 22px rgba(0,0,0,.13)",
                    border:`1.5px solid ${info.color}30`,
                    userSelect:"none",touchAction:"none",
                  }}>
                  <div style={{fontSize:13,fontWeight:700,color:info.color}}>{info.label}</div>
                  {(node.tasks||[]).length>0&&<div style={{fontSize:10,color:"#888",marginTop:2}}>{(node.tasks||[]).filter(t=>t.done).length}/{(node.tasks||[]).length} مهام</div>}
                  {node.dt&&<div style={{fontSize:9,color:info.color,marginTop:2}}>📅 {fmtDT(node.dt)}</div>}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Task Panel */}
      {activeNode&&anData&&anType&&anCard&&(()=>{
        const cw=canvasRef.current?.offsetWidth||600;
        const ch=canvasRef.current?.offsetHeight||600;
        const pw=248, ph=340;
        let px=anData.x+130, py=anData.y;
        if(px+pw>cw-10) px=anData.x-pw-8;
        if(py+ph>ch-8)  py=ch-ph-8;
        if(px<8) px=8;
        if(py<8) py=8;
        return (
          <div onClick={e=>e.stopPropagation()} style={{position:"absolute",left:px,top:py,width:pw,background:"#fff",borderRadius:20,boxShadow:"0 18px 60px rgba(0,0,0,.2)",padding:14,zIndex:300,border:`2px solid ${anType.color}25`}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div>
                <div style={{fontSize:13,fontWeight:900,color:anType.color}}>{anType.label}</div>
                <div style={{fontSize:11,color:"#aaa"}}>{anCard.emoji} {anCard.title}</div>
              </div>
              <button onClick={()=>setActiveNode(null)} style={{background:"#f0f0f0",border:"none",borderRadius:8,width:26,height:26,cursor:"pointer",fontSize:14,fontFamily:"Tajawal,sans-serif"}}>✕</button>
            </div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:11,color:"#aaa",marginBottom:4}}>📅 وقت وتاريخ</div>
              <input type="datetime-local" value={dtInput} onChange={e=>setDtInput(e.target.value)}
                style={{width:"100%",border:"1.5px solid #e0e0e0",borderRadius:10,padding:"7px 10px",fontFamily:"Tajawal,sans-serif",fontSize:12,outline:"none",marginBottom:6}}/>
              <button onClick={saveDT} style={{background:`linear-gradient(90deg,${anType.color},${anType.color}bb)`,color:"#fff",border:"none",borderRadius:10,padding:"7px 0",width:"100%",fontFamily:"Tajawal,sans-serif",fontSize:12,fontWeight:700,cursor:"pointer"}}>💾 حفظ الموعد</button>
            </div>
            <div style={{borderTop:"1px solid #f0f0f0",paddingTop:10}}>
              <div style={{fontSize:11,color:"#aaa",marginBottom:6}}>📝 المهام</div>
              <div style={{maxHeight:120,overflowY:"auto",marginBottom:8}}>
                {(anData.tasks||[]).length===0&&<div style={{fontSize:12,color:"#ddd",textAlign:"center",padding:"8px 0"}}>لا توجد مهام بعد</div>}
                {(anData.tasks||[]).map(t=>(
                  <div key={t.id} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 0",borderBottom:"1px solid #f8f8f8"}}>
                    <div onClick={()=>toggleTask(activeNode.cardId,activeNode.nodeId,t.id)}
                      style={{width:18,height:18,borderRadius:6,border:`2px solid ${anType.color}`,background:t.done?anType.color:"transparent",cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff"}}>
                      {t.done?"✓":""}
                    </div>
                    <span style={{flex:1,fontSize:12,color:t.done?"#ccc":"#333",textDecoration:t.done?"line-through":"none"}}>{t.text}</span>
                    <button onClick={()=>deleteTask(activeNode.cardId,activeNode.nodeId,t.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:"#ddd",padding:0}}>✕</button>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",gap:6}}>
                <input value={taskInput} onChange={e=>setTaskInput(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&addTask()}
                  placeholder="أضف مهمة..."
                  style={{flex:1,border:"1.5px solid #e0e0e0",borderRadius:10,padding:"7px 10px",fontFamily:"Tajawal,sans-serif",fontSize:12,outline:"none"}}/>
                <button onClick={addTask} style={{background:anType.color,color:"#fff",border:"none",borderRadius:10,padding:"0 14px",cursor:"pointer",fontSize:18,fontWeight:900,fontFamily:"Tajawal,sans-serif"}}>+</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Empty state */}
      {cards.length===0&&(
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
          <div style={{fontSize:48,marginBottom:12,opacity:.25}}>💡</div>
          <div style={{fontSize:15,color:pageStyle.dark?"rgba(255,255,255,.3)":"#bbb",fontWeight:600}}>اضغط ✨ فكرتى ← إضافة فكرة جديدة</div>
        </div>
      )}

      {/* Toast */}
      {toast&&<div style={{position:"absolute",bottom:20,left:"50%",transform:"translateX(-50%)",background:"#1a1a2e",color:"#fff",padding:"10px 26px",borderRadius:50,fontSize:13,zIndex:1000,whiteSpace:"nowrap",boxShadow:"0 6px 24px rgba(0,0,0,.25)",pointerEvents:"none"}}>{toast}</div>}
    </div>
  );
}

function Mitem({icon,label,onClick}) {
  const [h,setH]=useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:10,border:"none",background:h?"#f5f5f5":"transparent",fontFamily:"Tajawal,sans-serif",fontSize:14,fontWeight:500,cursor:"pointer",width:"100%",textAlign:"right",color:"#333"}}>
      <span style={{fontSize:16}}>{icon}</span>{label}
    </button>
  );
}
