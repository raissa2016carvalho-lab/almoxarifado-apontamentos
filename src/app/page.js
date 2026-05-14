"use client";
import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  onSnapshot,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const FUNCIONARIOS = [
  "Carlos Silva",
  "Ana Rodrigues",
  "João Ferreira",
  "Maria Santos",
  "Pedro Lima",
  "Fernanda Costa",
];

const ATIVIDADES = [
  "Recebimento de mercadorias",
  "Conferência de estoque",
  "Separação de pedidos",
  "Organização de prateleiras",
  "Inventário",
  "Emissão de nota fiscal",
  "Carregamento / expedição",
  "Devolução de produtos",
  "Limpeza e organização",
  "Atendimento interno",
  "Outra",
];

function formatDuration(startSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - startSeconds;
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
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

const COLORS = [
  "#e63946","#2a9d8f","#e9c46a","#264653","#f4a261","#457b9d","#a8dadc",
];
function getColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h += name.charCodeAt(i);
  return COLORS[h % COLORS.length];
}

export default function Home() {
  const [view, setView] = useState("dashboard"); // dashboard | novo | historico
  const [form, setForm] = useState({ funcionario: "", atividade: "", obs: "" });
  const [ativas, setAtivas] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [filtroFunc, setFiltroFunc] = useState("");

  // Timer tick
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Atividades ativas
  useEffect(() => {
    const q = query(
      collection(db, "apontamentos"),
      where("status", "==", "ativo"),
      orderBy("inicio", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setAtivas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Histórico
  useEffect(() => {
    const q = query(
      collection(db, "apontamentos"),
      where("status", "==", "finalizado"),
      orderBy("fim", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setHistorico(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  async function iniciarAtividade() {
    if (!form.funcionario || !form.atividade) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "apontamentos"), {
        funcionario: form.funcionario,
        atividade: form.atividade,
        obs: form.obs || "",
        inicio: serverTimestamp(),
        fim: null,
        status: "ativo",
      });
      setForm({ funcionario: "", atividade: "", obs: "" });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setView("dashboard");
      }, 1500);
    } catch (e) {
      alert("Erro ao registrar: " + e.message);
    }
    setLoading(false);
  }

  async function finalizarAtividade(id) {
    await updateDoc(doc(db, "apontamentos", id), {
      fim: serverTimestamp(),
      status: "finalizado",
    });
  }

  const historicoFiltrado = filtroFunc
    ? historico.filter((a) => a.funcionario === filtroFunc)
    : historico;

  return (
    <div className="app">
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
              <span className="logo-sub">Sistema de Apontamentos</span>
            </div>
          </div>
          <nav className="nav">
            <button className={view === "dashboard" ? "nav-btn active" : "nav-btn"} onClick={() => setView("dashboard")}>
              Painel
            </button>
            <button className={view === "novo" ? "nav-btn active" : "nav-btn"} onClick={() => setView("novo")}>
              + Novo
            </button>
            <button className={view === "historico" ? "nav-btn active" : "nav-btn"} onClick={() => setView("historico")}>
              Histórico
            </button>
          </nav>
        </div>
      </header>

      <main className="main">
        {/* DASHBOARD */}
        {view === "dashboard" && (
          <div className="section">
            <div className="section-header">
              <h1>Atividades em andamento</h1>
              <span className="badge-count">{ativas.length} ativa{ativas.length !== 1 ? "s" : ""}</span>
            </div>

            {ativas.length === 0 ? (
              <div className="empty-state">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="22" stroke="#cbd5e1" strokeWidth="2"/>
                  <path d="M16 24h16M24 16v16" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <p>Nenhuma atividade em andamento</p>
                <button className="btn-primary" onClick={() => setView("novo")}>Registrar atividade</button>
              </div>
            ) : (
              <div className="cards-grid">
                {ativas.map((a) => (
                  <div className="card-ativa" key={a.id}>
                    <div className="card-header">
                      <div className="avatar" style={{ background: getColor(a.funcionario) }}>
                        {getInitials(a.funcionario)}
                      </div>
                      <div className="card-info">
                        <span className="card-nome">{a.funcionario}</span>
                        <span className="card-atividade">{a.atividade}</span>
                      </div>
                      <div className="pulse-dot" />
                    </div>
                    <div className="card-meta">
                      <span className="card-time">
                        ⏱ {a.inicio ? formatDuration(a.inicio.seconds) : "..."}
                      </span>
                      <span className="card-inicio">Início: {formatTime(a.inicio)}</span>
                    </div>
                    {a.obs && <p className="card-obs">{a.obs}</p>}
                    <button className="btn-finalizar" onClick={() => finalizarAtividade(a.id)}>
                      ✓ Finalizar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* NOVO APONTAMENTO */}
        {view === "novo" && (
          <div className="section form-section">
            <h1>Registrar atividade</h1>

            {success ? (
              <div className="success-msg">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <circle cx="20" cy="20" r="18" fill="#22c55e" opacity="0.15"/>
                  <circle cx="20" cy="20" r="14" fill="#22c55e"/>
                  <path d="M13 20l5 5 9-9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p>Atividade registrada!</p>
              </div>
            ) : (
              <div className="form-card">
                <div className="form-group">
                  <label>Funcionário</label>
                  <select value={form.funcionario} onChange={(e) => setForm({ ...form, funcionario: e.target.value })}>
                    <option value="">Selecione o funcionário</option>
                    {FUNCIONARIOS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Atividade</label>
                  <select value={form.atividade} onChange={(e) => setForm({ ...form, atividade: e.target.value })}>
                    <option value="">Selecione a atividade</option>
                    {ATIVIDADES.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Observação <span className="optional">(opcional)</span></label>
                  <textarea
                    placeholder="Detalhes adicionais..."
                    value={form.obs}
                    onChange={(e) => setForm({ ...form, obs: e.target.value })}
                    rows={3}
                  />
                </div>

                <button
                  className="btn-primary full"
                  onClick={iniciarAtividade}
                  disabled={!form.funcionario || !form.atividade || loading}
                >
                  {loading ? "Registrando..." : "▶ Iniciar atividade"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* HISTÓRICO */}
        {view === "historico" && (
          <div className="section">
            <div className="section-header">
              <h1>Histórico</h1>
              <select
                className="filtro-select"
                value={filtroFunc}
                onChange={(e) => setFiltroFunc(e.target.value)}
              >
                <option value="">Todos funcionários</option>
                {FUNCIONARIOS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            {historicoFiltrado.length === 0 ? (
              <div className="empty-state">
                <p>Nenhum registro encontrado.</p>
              </div>
            ) : (
              <div className="historico-list">
                {historicoFiltrado.map((a) => {
                  let duracao = "--";
                  if (a.inicio && a.fim) {
                    const diff = Math.floor((a.fim.seconds - a.inicio.seconds));
                    const h = Math.floor(diff / 3600);
                    const m = Math.floor((diff % 3600) / 60);
                    duracao = h > 0 ? `${h}h ${m}m` : `${m}m`;
                  }
                  return (
                    <div className="historico-item" key={a.id}>
                      <div className="avatar sm" style={{ background: getColor(a.funcionario) }}>
                        {getInitials(a.funcionario)}
                      </div>
                      <div className="historico-info">
                        <span className="hist-nome">{a.funcionario}</span>
                        <span className="hist-ativ">{a.atividade}</span>
                        {a.obs && <span className="hist-obs">{a.obs}</span>}
                      </div>
                      <div className="historico-meta">
                        <span className="hist-dur">{duracao}</span>
                        <span className="hist-time">{formatDateTime(a.fim)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', system-ui, sans-serif; background: #f1f5f9; color: #1e293b; }
        .app { min-height: 100vh; }

        .header { background: #0f4c75; color: white; position: sticky; top: 0; z-index: 10; }
        .header-inner { max-width: 1100px; margin: 0 auto; padding: 0 1.5rem; display: flex; align-items: center; justify-content: space-between; height: 60px; }
        .logo { display: flex; align-items: center; gap: 10px; }
        .logo-title { font-size: 16px; font-weight: 700; display: block; line-height: 1.1; }
        .logo-sub { font-size: 11px; opacity: 0.65; display: block; }
        .nav { display: flex; gap: 4px; }
        .nav-btn { background: transparent; border: none; color: rgba(255,255,255,0.7); padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 14px; transition: all 0.15s; }
        .nav-btn:hover { background: rgba(255,255,255,0.12); color: white; }
        .nav-btn.active { background: rgba(255,255,255,0.2); color: white; font-weight: 500; }

        .main { max-width: 1100px; margin: 0 auto; padding: 2rem 1.5rem; }
        .section { }
        .section-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
        h1 { font-size: 22px; font-weight: 700; color: #0f172a; }
        .badge-count { background: #0f4c75; color: white; padding: 3px 10px; border-radius: 20px; font-size: 13px; font-weight: 600; }

        .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
        .card-ativa { background: white; border-radius: 12px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04); border: 1px solid #e2e8f0; }
        .card-header { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
        .avatar { width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; color: white; flex-shrink: 0; }
        .avatar.sm { width: 34px; height: 34px; font-size: 12px; flex-shrink: 0; }
        .card-info { flex: 1; }
        .card-nome { display: block; font-weight: 600; font-size: 15px; color: #0f172a; }
        .card-atividade { display: block; font-size: 13px; color: #64748b; margin-top: 2px; }
        .pulse-dot { width: 10px; height: 10px; border-radius: 50%; background: #22c55e; flex-shrink: 0; margin-top: 4px; animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        .card-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .card-time { font-size: 18px; font-weight: 700; color: #0f4c75; font-variant-numeric: tabular-nums; }
        .card-inicio { font-size: 12px; color: #94a3b8; }
        .card-obs { font-size: 12px; color: #64748b; background: #f8fafc; border-radius: 6px; padding: 6px 10px; margin-bottom: 12px; border-left: 3px solid #e2e8f0; }
        .btn-finalizar { width: 100%; padding: 9px; background: #0f4c75; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .btn-finalizar:hover { background: #0a3d5e; transform: translateY(-1px); }
        .btn-finalizar:active { transform: translateY(0); }

        .empty-state { text-align: center; padding: 4rem 2rem; color: #94a3b8; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
        .empty-state p { font-size: 15px; }

        .form-section { max-width: 520px; }
        .form-card { background: white; border-radius: 12px; padding: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.07); border: 1px solid #e2e8f0; }
        .form-group { margin-bottom: 1.25rem; }
        .form-group label { display: block; font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 6px; }
        .optional { font-weight: 400; color: #94a3b8; font-size: 12px; }
        .form-group select, .form-group textarea {
          width: 100%; padding: 10px 12px; border: 1.5px solid #e2e8f0; border-radius: 8px;
          font-size: 15px; color: #1e293b; background: #fafafa; transition: border-color 0.15s;
          font-family: inherit;
        }
        .form-group select:focus, .form-group textarea:focus { outline: none; border-color: #0f4c75; background: white; }
        .btn-primary { background: #0f4c75; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .btn-primary:hover { background: #0a3d5e; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-primary.full { width: 100%; padding: 13px; }

        .success-msg { text-align: center; padding: 3rem; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
        .success-msg p { font-size: 18px; font-weight: 600; color: #16a34a; }

        .filtro-select { padding: 7px 12px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 14px; color: #374151; background: white; cursor: pointer; }
        .historico-list { display: flex; flex-direction: column; gap: 10px; }
        .historico-item { background: white; border-radius: 10px; padding: 1rem 1.25rem; display: flex; align-items: center; gap: 14px; border: 1px solid #e2e8f0; }
        .historico-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
        .hist-nome { font-size: 14px; font-weight: 600; color: #0f172a; }
        .hist-ativ { font-size: 13px; color: #475569; }
        .hist-obs { font-size: 12px; color: #94a3b8; }
        .historico-meta { text-align: right; flex-shrink: 0; }
        .hist-dur { display: block; font-size: 15px; font-weight: 700; color: #0f4c75; }
        .hist-time { display: block; font-size: 11px; color: #94a3b8; margin-top: 2px; }

        @media (max-width: 600px) {
          .header-inner { padding: 0 1rem; }
          .logo-sub { display: none; }
          .nav-btn { padding: 6px 10px; font-size: 13px; }
          .main { padding: 1.25rem 1rem; }
          h1 { font-size: 18px; }
        }
      `}</style>
    </div>
  );
}

