"use client";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

function formatDuration(startSeconds, endSeconds) {
  if (!startSeconds) return "...";
  const end = endSeconds || Math.floor(Date.now() / 1000);
  const diff = Math.floor(end - startSeconds);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}

function formatTime(ts) {
  if (!ts) return "--";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(ts) {
  if (!ts) return "--";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

const COLORS = ["#e63946","#2a9d8f","#e9c46a","#264653","#f4a261","#457b9d"];
function getColor(name) {
  if (!name) return COLORS[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h += name.charCodeAt(i);
  return COLORS[h % COLORS.length];
}

function calcMinutes(a) {
  if (!a.inicio || !a.fim) return 0;
  return Math.floor((a.fim.seconds - a.inicio.seconds) / 60);
}

export default function GestaoPage() {
  const [ativas, setAtivas] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [tick, setTick] = useState(0);
  const [aba, setAba] = useState("funcionarios");

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const q = query(collection(db, "apontamentos"), where("status", "==", "ativo"), orderBy("inicio", "desc"));
    return onSnapshot(q, (snap) => setAtivas(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, []);

  useEffect(() => {
    const q = query(collection(db, "apontamentos"), where("status", "==", "finalizado"), orderBy("fim", "desc"));
    return onSnapshot(q, (snap) => setHistorico(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, []);

  const todos = [...ativas, ...historico];
  const porFuncionario = {};
  todos.forEach((a) => {
    if (!porFuncionario[a.funcionario]) porFuncionario[a.funcionario] = { nome: a.funcionario, atividades: [] };
    porFuncionario[a.funcionario].atividades.push(a);
  });
  const funcionarios = Object.values(porFuncionario).sort((a, b) => {
    const aA = a.atividades.some((x) => x.status === "ativo") ? 0 : 1;
    const bA = b.atividades.some((x) => x.status === "ativo") ? 0 : 1;
    return aA - bA;
  });

  const rankingFunc = Object.values(
    historico.reduce((acc, a) => {
      if (!acc[a.funcionario]) acc[a.funcionario] = { nome: a.funcionario, total: 0, minutos: 0 };
      acc[a.funcionario].total += 1;
      acc[a.funcionario].minutos += calcMinutes(a);
      return acc;
    }, {})
  ).sort((a, b) => b.total - a.total);

  const rankingAtiv = Object.values(
    historico.reduce((acc, a) => {
      if (!acc[a.atividade]) acc[a.atividade] = { nome: a.atividade, total: 0 };
      acc[a.atividade].total += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.total - a.total);

  const maxFunc = rankingFunc[0]?.total || 1;
  const maxAtiv = rankingAtiv[0]?.total || 1;

  return (
    <div className="page">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="#0f4c75"/>
              <rect x="5" y="8" width="18" height="3" rx="1.5" fill="white"/>
              <rect x="5" y="13" width="12" height="3" rx="1.5" fill="white" opacity="0.7"/>
              <rect x="5" y="18" width="15" height="3" rx="1.5" fill="white" opacity="0.5"/>
            </svg>
            <div>
              <span className="logo-title">Almoxarifado</span>
              <span className="logo-sub">Painel de Gestão</span>
            </div>
          </div>
          <div className="header-stats">
            <div className="stat"><span className="stat-num">{ativas.length}</span><span className="stat-label">Em andamento</span></div>
            <div className="stat"><span className="stat-num">{historico.length}</span><span className="stat-label">Total registros</span></div>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="tabs">
          <button className={aba==="funcionarios"?"tab active":"tab"} onClick={()=>setAba("funcionarios")}>
            Funcionários {ativas.length>0&&<span className="badge">{ativas.length} ativo{ativas.length>1?"s":""}</span>}
          </button>
          <button className={aba==="ranking"?"tab active":"tab"} onClick={()=>setAba("ranking")}>Ranking</button>
          <a href="/gestao/admin" className="tab-link">⚙️ Admin</a>
        </div>

        {aba==="funcionarios" && (
          <>
            {funcionarios.length===0 ? (
              <div className="empty"><p>Nenhuma atividade registrada ainda.</p></div>
            ) : (
              <div className="func-grid">
                {funcionarios.map((f) => {
                  const atividadeAtiva = f.atividades.find((a) => a.status==="ativo");
                  const finalizadas = f.atividades.filter((a) => a.status==="finalizado");
                  return (
                    <div className={`func-card ${atividadeAtiva?"func-card--ativa":""}`} key={f.nome}>
                      <div className="func-header">
                        <div className="avatar" style={{background:getColor(f.nome)}}>{getInitials(f.nome)}</div>
                        <div className="func-info">
                          <span className="func-nome">{f.nome}</span>
                          {atividadeAtiva
                            ? <span className="status-tag ativo">● Em atividade</span>
                            : <span className="status-tag livre">○ Livre</span>}
                        </div>
                        <span className="func-count">{f.atividades.length} atividade{f.atividades.length>1?"s":""}</span>
                      </div>
                      {atividadeAtiva && (
                        <div className="ativ-atual">
                          <div className="ativ-atual-row">
                            <span className="ativ-atual-nome">{atividadeAtiva.atividade}</span>
                            <span className="ativ-timer">{formatDuration(atividadeAtiva.inicio?.seconds)}</span>
                          </div>
                          <span className="ativ-inicio">Início: {formatTime(atividadeAtiva.inicio)}</span>
                          {atividadeAtiva.obs&&<span className="ativ-obs">{atividadeAtiva.obs}</span>}
                        </div>
                      )}
                      {finalizadas.length>0 && (
                        <div className="ativ-lista">
                          <span className="ativ-lista-label">Histórico do dia</span>
                          {finalizadas.slice(0,5).map((a) => {
                            const min=calcMinutes(a);
                            const h=Math.floor(min/60);
                            const m=min%60;
                            const dur=h>0?`${h}h ${m}m`:min<1?"<1m":`${m}m`;
                            return (
                              <div className="ativ-item" key={a.id}>
                                <span className="ativ-check">✓</span>
                                <span className="ativ-item-nome">{a.atividade}</span>
                                <span className="ativ-item-dur">{dur}</span>
                                <span className="ativ-item-hora">{formatTime(a.fim)}</span>
                              </div>
                            );
                          })}
                          {finalizadas.length>5&&<span className="ativ-mais">+{finalizadas.length-5} mais</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {aba==="ranking" && (
          <div>
            {historico.length===0 ? (
              <div className="empty"><p>Nenhum dado ainda.</p></div>
            ) : (
              <>
                <div className="resumo-grid">
                  <div className="resumo-card"><span className="resumo-num">{historico.length}</span><span className="resumo-label">Total atividades</span></div>
                  <div className="resumo-card"><span className="resumo-num">{rankingFunc.length}</span><span className="resumo-label">Funcionários ativos</span></div>
                  <div className="resumo-card">
                    <span className="resumo-num">{(()=>{const t=historico.reduce((a,x)=>a+calcMinutes(x),0);const h=Math.floor(t/60);const m=t%60;return h>0?`${h}h ${m}m`:`${m}m`;})()}</span>
                    <span className="resumo-label">Tempo total</span>
                  </div>
                  <div className="resumo-card"><span className="resumo-num">{rankingAtiv.length}</span><span className="resumo-label">Tipos de atividade</span></div>
                </div>
                <div className="ranking-grid">
                  <div className="ranking-card">
                    <h2 className="ranking-title">👤 Funcionários</h2>
                    <p className="ranking-sub">por atividades realizadas</p>
                    <div className="ranking-list">
                      {rankingFunc.map((f,i) => (
                        <div className="rank-item" key={f.nome}>
                          <div className="rank-pos" style={{background:i===0?"#f59e0b":i===1?"#94a3b8":i===2?"#b45309":"#e2e8f0",color:i<3?"white":"#64748b"}}>{i+1}</div>
                          <div className="avatar xs" style={{background:getColor(f.nome)}}>{getInitials(f.nome)}</div>
                          <div className="rank-info">
                            <span className="rank-nome">{f.nome}</span>
                            <div className="rank-bar-wrap"><div className="rank-bar" style={{width:`${(f.total/maxFunc)*100}%`,background:getColor(f.nome)}}/></div>
                          </div>
                          <div className="rank-nums"><span className="rank-total">{f.total}</span><span className="rank-label">atividades</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="ranking-card">
                    <h2 className="ranking-title">📋 Atividades mais realizadas</h2>
                    <p className="ranking-sub">por frequência</p>
                    <div className="ranking-list">
                      {rankingAtiv.map((a,i) => (
                        <div className="rank-item" key={a.nome}>
                          <div className="rank-pos" style={{background:i===0?"#f59e0b":i===1?"#94a3b8":i===2?"#b45309":"#e2e8f0",color:i<3?"white":"#64748b"}}>{i+1}</div>
                          <div className="rank-info">
                            <span className="rank-nome">{a.nome}</span>
                            <div className="rank-bar-wrap"><div className="rank-bar" style={{width:`${(a.total/maxAtiv)*100}%`,background:"#0f4c75"}}/></div>
                          </div>
                          <div className="rank-nums"><span className="rank-total">{a.total}</span><span className="rank-label">vezes</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Inter',system-ui,sans-serif;background:#f1f5f9;min-height:100vh}
        .header{background:#0f4c75}
        .header-inner{max-width:1100px;margin:0 auto;padding:0 1.5rem;height:64px;display:flex;align-items:center;justify-content:space-between}
        .logo{display:flex;align-items:center;gap:10px}
        .logo-title{display:block;font-size:16px;font-weight:700;color:white;line-height:1.1}
        .logo-sub{display:block;font-size:11px;color:rgba(255,255,255,0.6)}
        .header-stats{display:flex;gap:2rem}
        .stat{text-align:right}
        .stat-num{display:block;font-size:22px;font-weight:700;color:white;line-height:1}
        .stat-label{display:block;font-size:11px;color:rgba(255,255,255,0.6)}
        .main{max-width:1100px;margin:0 auto;padding:1.5rem}
        .tabs{display:flex;gap:4px;margin-bottom:1.5rem;background:white;border-radius:10px;padding:4px;box-shadow:0 1px 3px rgba(0,0,0,0.06);width:fit-content;align-items:center}
        .tab{padding:8px 20px;border:none;background:transparent;border-radius:8px;font-size:14px;font-weight:500;color:#64748b;cursor:pointer;display:flex;align-items:center;gap:8px;transition:all 0.15s}
        .tab.active{background:#0f4c75;color:white}
        .tab-link{padding:8px 16px;border-radius:8px;font-size:13px;font-weight:500;color:#64748b;text-decoration:none;transition:all 0.15s}
        .tab-link:hover{background:#f1f5f9}
        .badge{background:#dcfce7;color:#16a34a;border-radius:20px;padding:1px 8px;font-size:12px;font-weight:600}
        .tab.active .badge{background:rgba(255,255,255,0.25);color:white}
        .empty{text-align:center;padding:4rem;color:#94a3b8;font-size:15px}
        .func-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}
        .func-card{background:white;border-radius:12px;padding:1.25rem;border:1.5px solid #e2e8f0}
        .func-card--ativa{border-color:#22c55e}
        .func-header{display:flex;align-items:center;gap:12px;margin-bottom:12px}
        .avatar{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:white;flex-shrink:0}
        .avatar.xs{width:28px;height:28px;font-size:10px;flex-shrink:0}
        .func-info{flex:1}
        .func-nome{display:block;font-weight:700;font-size:15px;color:#0f172a}
        .status-tag{font-size:12px;font-weight:500}
        .status-tag.ativo{color:#16a34a}
        .status-tag.livre{color:#94a3b8}
        .func-count{font-size:12px;color:#94a3b8;flex-shrink:0}
        .ativ-atual{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 12px;margin-bottom:12px}
        .ativ-atual-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:2px}
        .ativ-atual-nome{font-size:13px;font-weight:600;color:#15803d}
        .ativ-timer{font-size:16px;font-weight:700;color:#15803d;font-variant-numeric:tabular-nums}
        .ativ-inicio{display:block;font-size:11px;color:#86efac}
        .ativ-obs{display:block;font-size:11px;color:#4ade80;margin-top:4px;font-style:italic}
        .ativ-lista{border-top:1px solid #f1f5f9;padding-top:10px}
        .ativ-lista-label{display:block;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px}
        .ativ-item{display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid #f8fafc}
        .ativ-item:last-child{border-bottom:none}
        .ativ-check{color:#22c55e;font-size:12px;flex-shrink:0}
        .ativ-item-nome{flex:1;font-size:13px;color:#475569}
        .ativ-item-dur{font-size:12px;font-weight:600;color:#0f4c75;flex-shrink:0}
        .ativ-item-hora{font-size:11px;color:#cbd5e1;flex-shrink:0;margin-left:4px}
        .ativ-mais{display:block;font-size:12px;color:#94a3b8;margin-top:6px}
        .resumo-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:20px}
        .resumo-card{background:white;border-radius:10px;padding:1rem 1.25rem;border:1px solid #e2e8f0;text-align:center}
        .resumo-num{display:block;font-size:28px;font-weight:700;color:#0f4c75;line-height:1;margin-bottom:4px}
        .resumo-label{display:block;font-size:12px;color:#64748b}
        .ranking-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px}
        .ranking-card{background:white;border-radius:12px;padding:1.5rem;border:1px solid #e2e8f0}
        .ranking-title{font-size:16px;font-weight:700;color:#0f172a;margin-bottom:2px}
        .ranking-sub{font-size:12px;color:#94a3b8;margin-bottom:1.25rem}
        .ranking-list{display:flex;flex-direction:column;gap:14px}
        .rank-item{display:flex;align-items:center;gap:10px}
        .rank-pos{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0}
        .rank-info{flex:1;display:flex;flex-direction:column;gap:4px}
        .rank-nome{font-size:13px;font-weight:600;color:#0f172a}
        .rank-bar-wrap{height:6px;background:#f1f5f9;border-radius:3px;overflow:hidden}
        .rank-bar{height:100%;border-radius:3px;transition:width 0.5s}
        .rank-nums{text-align:right;flex-shrink:0}
        .rank-total{display:block;font-size:18px;font-weight:700;color:#0f172a;line-height:1}
        .rank-label{display:block;font-size:11px;color:#94a3b8}
        @media(max-width:600px){.header-stats{gap:1rem}.stat-num{font-size:18px}.tabs{width:100%}.tab{flex:1;justify-content:center;padding:8px 6px;font-size:12px}}
      `}</style>
    </div>
  );
}
