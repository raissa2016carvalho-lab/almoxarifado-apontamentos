"use client";
import { useState, useEffect } from "react"; 
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

function formatDuration(startSeconds) {
  if (!startSeconds) return "...";
  const diff = Math.floor(Date.now() / 1000) - startSeconds;
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
  return d.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function getInitials(name) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

const COLORS = ["#e63946","#2a9d8f","#e9c46a","#264653","#f4a261","#457b9d"];
function getColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h += name.charCodeAt(i);
  return COLORS[h % COLORS.length];
}

export default function GestaoPage() {
  const [ativas, setAtivas] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [tick, setTick] = useState(0);
  const [abaHistorico, setAbaHistorico] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "apontamentos"),
      where("status", "==", "ativo"),
      orderBy("inicio", "desc")
    );
    return onSnapshot(q, (snap) => {
      setAtivas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "apontamentos"),
      where("status", "==", "finalizado"),
      orderBy("fim", "desc")
    );
    return onSnapshot(q, (snap) => {
      setHistorico(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

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
            <div className="stat">
              <span className="stat-num">{ativas.length}</span>
              <span className="stat-label">Em andamento</span>
            </div>
            <div className="stat">
              <span className="stat-num">{historico.length}</span>
              <span className="stat-label">Finalizadas hoje</span>
            </div>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="tabs">
          <button className={!abaHistorico ? "tab active" : "tab"} onClick={() => setAbaHistorico(false)}>
            Atividades em andamento
            {ativas.length > 0 && <span className="badge">{ativas.length}</span>}
          </button>
          <button className={abaHistorico ? "tab active" : "tab"} onClick={() => setAbaHistorico(true)}>
            Histórico
            {historico.length > 0 && <span className="badge">{historico.length}</span>}
          </button>
        </div>

        {!abaHistorico && (
          <>
            {ativas.length === 0 ? (
              <div className="empty">
                <p>Nenhuma atividade em andamento no momento.</p>
              </div>
            ) : (
              <div className="grid">
                {ativas.map((a) => (
                  <div className="card" key={a.id}>
                    <div className="card-top">
                      <div className="avatar" style={{ background: getColor(a.funcionario) }}>
                        {getInitials(a.funcionario)}
                      </div>
                      <div className="card-info">
                        <span className="card-nome">{a.funcionario}</span>
                        <span className="card-ativ">{a.atividade}</span>
                      </div>
                      <div className="dot" />
                    </div>
                    {a.obs && <p className="card-obs">{a.obs}</p>}
                    <div className="card-footer">
                      <span className="timer">{formatDuration(a.inicio?.seconds)}</span>
                      <span className="inicio-time">Início: {formatTime(a.inicio)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {abaHistorico && (
          <>
            {historico.length === 0 ? (
              <div className="empty"><p>Nenhuma atividade finalizada ainda.</p></div>
            ) : (
              <div className="hist-list">
                {historico.map((a) => {
                  let duracao = "--";
                  if (a.inicio && a.fim) {
                    const diff = Math.floor(a.fim.seconds - a.inicio.seconds);
                    const h = Math.floor(diff / 3600);
                    const m = Math.floor((diff % 3600) / 60);
                    duracao = h > 0 ? `${h}h ${m}m` : `${m}m`;
                  }
                  return (
                    <div className="hist-item" key={a.id}>
                      <div className="avatar sm" style={{ background: getColor(a.funcionario) }}>
                        {getInitials(a.funcionario)}
                      </div>
                      <div className="hist-info">
                        <span className="hist-nome">{a.funcionario}</span>
                        <span className="hist-ativ">{a.atividade}</span>
                        {a.obs && <span className="hist-obs">{a.obs}</span>}
                      </div>
                      <div className="hist-meta">
                        <span className="hist-dur">{duracao}</span>
                        <span className="hist-dt">{formatDateTime(a.fim)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', system-ui, sans-serif; background: #f1f5f9; min-height: 100vh; }

        .header { background: #0f4c75; }
        .header-inner { max-width: 1100px; margin: 0 auto; padding: 0 1.5rem; height: 64px; display: flex; align-items: center; justify-content: space-between; }
        .logo { display: flex; align-items: center; gap: 10px; }
        .logo-title { display: block; font-size: 16px; font-weight: 700; color: white; line-height: 1.1; }
        .logo-sub { display: block; font-size: 11px; color: rgba(255,255,255,0.6); }
        .header-stats { display: flex; gap: 2rem; }
        .stat { text-align: right; }
        .stat-num { display: block; font-size: 22px; font-weight: 700; color: white; line-height: 1; }
        .stat-label { display: block; font-size: 11px; color: rgba(255,255,255,0.6); }

        .main { max-width: 1100px; margin: 0 auto; padding: 1.5rem; }

        .tabs { display: flex; gap: 4px; margin-bottom: 1.5rem; background: white; border-radius: 10px; padding: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); width: fit-content; }
        .tab { padding: 8px 20px; border: none; background: transparent; border-radius: 8px; font-size: 14px; font-weight: 500; color: #64748b; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.15s; }
        .tab.active { background: #0f4c75; color: white; }
        .badge { background: #e2e8f0; color: #475569; border-radius: 20px; padding: 1px 8px; font-size: 12px; font-weight: 600; }
        .tab.active .badge { background: rgba(255,255,255,0.25); color: white; }

        .empty { text-align: center; padding: 4rem; color: #94a3b8; font-size: 15px; }

        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
        .card { background: white; border-radius: 12px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .card-top { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
        .avatar { width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; color: white; flex-shrink: 0; }
        .avatar.sm { width: 36px; height: 36px; font-size: 12px; flex-shrink: 0; }
        .card-info { flex: 1; }
        .card-nome { display: block; font-weight: 600; font-size: 15px; color: #0f172a; }
        .card-ativ { display: block; font-size: 13px; color: #64748b; margin-top: 2px; }
        .dot { width: 10px; height: 10px; border-radius: 50%; background: #22c55e; flex-shrink: 0; margin-top: 4px; animation: blink 2s infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .card-obs { font-size: 12px; color: #64748b; background: #f8fafc; border-radius: 6px; padding: 6px 10px; margin-bottom: 10px; border-left: 3px solid #e2e8f0; }
        .card-footer { display: flex; justify-content: space-between; align-items: center; }
        .timer { font-size: 20px; font-weight: 700; color: #0f4c75; font-variant-numeric: tabular-nums; }
        .inicio-time { font-size: 12px; color: #94a3b8; }

        .hist-list { display: flex; flex-direction: column; gap: 10px; }
        .hist-item { background: white; border-radius: 10px; padding: 1rem 1.25rem; display: flex; align-items: center; gap: 14px; border: 1px solid #e2e8f0; }
        .hist-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
        .hist-nome { font-size: 14px; font-weight: 600; color: #0f172a; }
        .hist-ativ { font-size: 13px; color: #475569; }
        .hist-obs { font-size: 12px; color: #94a3b8; }
        .hist-meta { text-align: right; flex-shrink: 0; }
        .hist-dur { display: block; font-size: 15px; font-weight: 700; color: #0f4c75; }
        .hist-dt { display: block; font-size: 11px; color: #94a3b8; margin-top: 2px; }

        @media (max-width: 600px) {
          .header-stats { gap: 1rem; }
          .stat-num { font-size: 18px; }
          .tabs { width: 100%; }
          .tab { flex: 1; justify-content: center; padding: 8px 10px; font-size: 13px; }
        }
      `}</style>
    </div>
  );
}
