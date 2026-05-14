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
  return d.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function getInitials(name) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

const COLORS = ["#e63946", "#2a9d8f", "#e9c46a", "#264653", "#f4a261", "#457b9d"];
function getColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h += name.charCodeAt(i);
  return COLORS[h % COLORS.length];
}

function calcDiffMinutes(a) {
  if (!a.inicio || !a.fim) return 0;
  return Math.floor((a.fim.seconds - a.inicio.seconds) / 60);
}

export default function GestaoPage() {
  const [ativas, setAtivas] = useState([]);
  const [recentes, setRecentes] = useState([]); // finalizadas recentemente (últimas 20)
  const [historico, setHistorico] = useState([]);
  const [tick, setTick] = useState(0);
  const [aba, setAba] = useState("andamento"); // andamento | historico | ranking

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
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRecentes(all.slice(0, 20));
      setHistorico(all);
    });
  }, []);

  // Ranking por funcionário
  const rankingFuncionarios = Object.values(
    historico.reduce((acc, a) => {
      const nome = a.funcionario;
      if (!acc[nome]) acc[nome] = { nome, total: 0, minutos: 0 };
      acc[nome].total += 1;
      acc[nome].minutos += calcDiffMinutes(a);
      return acc;
    }, {})
  ).sort((a, b) => b.total - a.total);

  // Ranking por atividade
  const rankingAtividades = Object.values(
    historico.reduce((acc, a) => {
      const nome = a.atividade;
      if (!acc[nome]) acc[nome] = { nome, total: 0, minutos: 0 };
      acc[nome].total += 1;
      acc[nome].minutos += calcDiffMinutes(a);
      return acc;
    }, {})
  ).sort((a, b) => b.total - a.total);

  const maxFunc = rankingFuncionarios[0]?.total || 1;
  const maxAtiv = rankingAtividades[0]?.total || 1;

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
              <span className="stat-label">Total registros</span>
            </div>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="tabs">
          <button className={aba === "andamento" ? "tab active" : "tab"} onClick={() => setAba("andamento")}>
            Em andamento
            {ativas.length > 0 && <span className="badge">{ativas.length}</span>}
          </button>
          <button className={aba === "historico" ? "tab active" : "tab"} onClick={() => setAba("historico")}>
            Histórico
            {recentes.length > 0 && <span className="badge">{historico.length}</span>}
          </button>
          <button className={aba === "ranking" ? "tab active" : "tab"} onClick={() => setAba("ranking")}>
            Ranking
          </button>
        </div>

        {/* ABA: EM ANDAMENTO + RECENTES */}
        {aba === "andamento" && (
          <div>
            {ativas.length === 0 && recentes.length === 0 && (
              <div className="empty"><p>Nenhuma atividade registrada ainda.</p></div>
            )}

            {ativas.length > 0 && (
              <>
                <p className="secao-label">🟢 Ativas agora</p>
                <div className="grid">
                  {ativas.map((a) => (
                    <div className="card ativa" key={a.id}>
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
              </>
            )}

            {recentes.length > 0 && (
              <>
                <p className="secao-label" style={{marginTop: ativas.length > 0 ? "2rem" : 0}}>⬜ Finalizadas recentemente</p>
                <div className="grid">
                  {recentes.map((a) => (
                    <div className="card finalizada" key={a.id}>
                      <div className="card-top">
                        <div className="avatar" style={{ background: getColor(a.funcionario), opacity: 0.7 }}>
                          {getInitials(a.funcionario)}
                        </div>
                        <div className="card-info">
                          <span className="card-nome">{a.funcionario}</span>
                          <span className="card-ativ">{a.atividade}</span>
                        </div>
                        <span className="tag-fin">Finalizada</span>
                      </div>
                      {a.obs && <p className="card-obs">{a.obs}</p>}
                      <div className="card-footer">
                        <span className="timer fin">{formatDuration(a.inicio?.seconds, a.fim?.seconds)}</span>
                        <span className="inicio-time">Fim: {formatTime(a.fim)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ABA: HISTÓRICO */}
        {aba === "historico" && (
          <>
            {historico.length === 0 ? (
              <div className="empty"><p>Nenhuma atividade finalizada ainda.</p></div>
            ) : (
              <div className="hist-list">
                {historico.map((a) => {
                  const min = calcDiffMinutes(a);
                  const h = Math.floor(min / 60);
                  const m = min % 60;
                  const dur = h > 0 ? `${h}h ${m}m` : `${m}m`;
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
                        <span className="hist-dur">{dur}</span>
                        <span className="hist-dt">{formatDateTime(a.fim)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ABA: RANKING */}
        {aba === "ranking" && (
          <div className="ranking-wrap">
            {historico.length === 0 ? (
              <div className="empty"><p>Nenhum dado ainda para exibir ranking.</p></div>
            ) : (
              <>
                <div className="ranking-grid">
                  {/* Ranking Funcionários */}
                  <div className="ranking-card">
                    <h2 className="ranking-title">👤 Funcionários</h2>
                    <p className="ranking-sub">por atividades realizadas</p>
                    <div className="ranking-list">
                      {rankingFuncionarios.map((f, i) => (
                        <div className="rank-item" key={f.nome}>
                          <div className="rank-pos" style={{ background: i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : i === 2 ? "#b45309" : "#e2e8f0", color: i < 3 ? "white" : "#64748b" }}>
                            {i + 1}
                          </div>
                          <div className="avatar xs" style={{ background: getColor(f.nome) }}>
                            {getInitials(f.nome)}
                          </div>
                          <div className="rank-info">
                            <span className="rank-nome">{f.nome}</span>
                            <div className="rank-bar-wrap">
                              <div className="rank-bar" style={{ width: `${(f.total / maxFunc) * 100}%`, background: getColor(f.nome) }} />
                            </div>
                          </div>
                          <div className="rank-nums">
                            <span className="rank-total">{f.total}</span>
                            <span className="rank-label">atividades</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ranking Atividades */}
                  <div className="ranking-card">
                    <h2 className="ranking-title">📋 Atividades</h2>
                    <p className="ranking-sub">por frequência de execução</p>
                    <div className="ranking-list">
                      {rankingAtividades.map((a, i) => (
                        <div className="rank-item" key={a.nome}>
                          <div className="rank-pos" style={{ background: i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : i === 2 ? "#b45309" : "#e2e8f0", color: i < 3 ? "white" : "#64748b" }}>
                            {i + 1}
                          </div>
                          <div className="rank-info" style={{marginLeft: 0}}>
                            <span className="rank-nome">{a.nome}</span>
                            <div className="rank-bar-wrap">
                              <div className="rank-bar" style={{ width: `${(a.total / maxAtiv) * 100}%`, background: "#0f4c75" }} />
                            </div>
                          </div>
                          <div className="rank-nums">
                            <span className="rank-total">{a.total}</span>
                            <span className="rank-label">vezes</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Resumo geral */}
                <div className="resumo-grid">
                  <div className="resumo-card">
                    <span className="resumo-num">{historico.length}</span>
                    <span className="resumo-label">Total de atividades</span>
                  </div>
                  <div className="resumo-card">
                    <span className="resumo-num">{rankingFuncionarios.length}</span>
                    <span className="resumo-label">Funcionários ativos</span>
                  </div>
                  <div className="resumo-card">
                    <span className="resumo-num">
                      {Math.round(historico.reduce((acc, a) => acc + calcDiffMinutes(a), 0) / (rankingFuncionarios.length || 1))}m
                    </span>
                    <span className="resumo-label">Tempo médio por pessoa</span>
                  </div>
                  <div className="resumo-card">
                    <span className="resumo-num">{rankingAtividades.length}</span>
                    <span className="resumo-label">Tipos de atividade</span>
                  </div>
                </div>
              </>
            )}
          </div>
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
        .secao-label { font-size: 13px; font-weight: 600; color: #64748b; margin-bottom: 12px; }
        .empty { text-align: center; padding: 4rem; color: #94a3b8; font-size: 15px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-bottom: 8px; }
        .card { background: white; border-radius: 12px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .card.finalizada { opacity: 0.75; }
        .card-top { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
        .avatar { width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; color: white; flex-shrink: 0; }
        .avatar.sm { width: 36px; height: 36px; font-size: 12px; flex-shrink: 0; }
        .avatar.xs { width: 30px; height: 30px; font-size: 11px; flex-shrink: 0; }
        .card-info { flex: 1; }
        .card-nome { display: block; font-weight: 600; font-size: 15px; color: #0f172a; }
        .card-ativ { display: block; font-size: 13px; color: #64748b; margin-top: 2px; }
        .dot { width: 10px; height: 10px; border-radius: 50%; background: #22c55e; flex-shrink: 0; margin-top: 4px; animation: blink 2s infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .tag-fin { font-size: 11px; font-weight: 600; color: #64748b; background: #f1f5f9; border-radius: 6px; padding: 3px 8px; flex-shrink: 0; }
        .card-obs { font-size: 12px; color: #64748b; background: #f8fafc; border-radius: 6px; padding: 6px 10px; margin-bottom: 10px; border-left: 3px solid #e2e8f0; }
        .card-footer { display: flex; justify-content: space-between; align-items: center; }
        .timer { font-size: 20px; font-weight: 700; color: #0f4c75; font-variant-numeric: tabular-nums; }
        .timer.fin { color: #64748b; font-size: 17px; }
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
        .ranking-wrap { }
        .ranking-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .ranking-card { background: white; border-radius: 12px; padding: 1.5rem; border: 1px solid #e2e8f0; }
        .ranking-title { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
        .ranking-sub { font-size: 12px; color: #94a3b8; margin-bottom: 1.25rem; }
        .ranking-list { display: flex; flex-direction: column; gap: 14px; }
        .rank-item { display: flex; align-items: center; gap: 10px; }
        .rank-pos { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
        .rank-info { flex: 1; display: flex; flex-direction: column; gap: 4px; margin-left: 4px; }
        .rank-nome { font-size: 13px; font-weight: 600; color: #0f172a; }
        .rank-bar-wrap { height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; }
        .rank-bar { height: 100%; border-radius: 3px; transition: width 0.5s; }
        .rank-nums { text-align: right; flex-shrink: 0; }
        .rank-total { display: block; font-size: 18px; font-weight: 700; color: #0f172a; line-height: 1; }
        .rank-label { display: block; font-size: 11px; color: #94a3b8; }
        .resumo-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
        .resumo-card { background: white; border-radius: 10px; padding: 1rem 1.25rem; border: 1px solid #e2e8f0; text-align: center; }
        .resumo-num { display: block; font-size: 28px; font-weight: 700; color: #0f4c75; line-height: 1; margin-bottom: 4px; }
        .resumo-label { display: block; font-size: 12px; color: #64748b; }
        @media (max-width: 600px) {
          .header-stats { gap: 1rem; }
          .stat-num { font-size: 18px; }
          .tabs { width: 100%; }
          .tab { flex: 1; justify-content: center; padding: 8px 6px; font-size: 12px; }
        }
      `}</style>
    </div>
  );
}
