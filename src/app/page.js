"use client";
import { useState, useEffect } from "react";
import {
  collection, addDoc, updateDoc, doc,
  query, where, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const FUNCIONARIOS = [
  "Carlos Silva","Ana Rodrigues","João Ferreira",
  "Maria Santos","Pedro Lima","Fernanda Costa",
];

const ATIVIDADES = [
  "Recebimento de mercadorias","Conferência de estoque","Separação de pedidos",
  "Organização de prateleiras","Inventário","Emissão de nota fiscal",
  "Carregamento / expedição","Devolução de produtos","Limpeza e organização",
  "Atendimento interno","Outra",
];

function formatDuration(startSeconds) {
  if (!startSeconds) return "0s";
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

function getInitials(name) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

const COLORS = ["#e63946","#2a9d8f","#e9c46a","#264653","#f4a261","#457b9d"];
function getColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h += name.charCodeAt(i);
  return COLORS[h % COLORS.length];
}

export default function FuncionarioPage() {
  const [funcionario, setFuncionario] = useState("");
  const [atividades, setAtividades] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ atividade: "", obs: "" });
  const [loading, setLoading] = useState(false);
  const [encerrandoId, setEncerrandoId] = useState(null);
  const [tick, setTick] = useState(0);

  // Tick para atualizar cronômetros a cada segundo
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Recuperar nome salvo no localStorage ao carregar a página
  useEffect(() => {
    const saved = localStorage.getItem("almox_funcionario");
    if (saved) setFuncionario(saved);
  }, []);

  // Salvar nome no localStorage sempre que mudar
  useEffect(() => {
    if (funcionario) {
      localStorage.setItem("almox_funcionario", funcionario);
    }
  }, [funcionario]);

  // Escutar atividades ativas do funcionário em tempo real
  useEffect(() => {
    if (!funcionario) { setAtividades([]); return; }
    const q = query(
      collection(db, "apontamentos"),
      where("funcionario", "==", funcionario),
      where("status", "==", "ativo")
    );
    const unsub = onSnapshot(q, (snap) => {
      setAtividades(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [funcionario]);

  async function iniciarAtividade() {
    if (!funcionario || !form.atividade) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "apontamentos"), {
        funcionario,
        atividade: form.atividade,
        obs: form.obs || "",
        inicio: serverTimestamp(),
        fim: null,
        status: "ativo",
      });
      setForm({ atividade: "", obs: "" });
      setShowForm(false);
    } catch (e) {
      alert("Erro ao iniciar: " + e.message);
    }
    setLoading(false);
  }

  async function encerrarAtividade(id) {
    setEncerrandoId(id);
    try {
      await updateDoc(doc(db, "apontamentos", id), {
        fim: serverTimestamp(),
        status: "finalizado",
      });
    } catch (e) {
      alert("Erro ao encerrar: " + e.message);
    }
    setEncerrandoId(null);
  }

  function trocarFuncionario() {
    localStorage.removeItem("almox_funcionario");
    setFuncionario("");
    setAtividades([]);
    setShowForm(false);
  }

  const cor = funcionario ? getColor(funcionario) : "#0f4c75";

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
              <span className="logo-sub">Apontamento de Atividades</span>
            </div>
          </div>
          {funcionario && (
            <button className="btn-trocar" onClick={trocarFuncionario}>
              Trocar usuário
            </button>
          )}
        </div>
      </header>

      <main className="main">

        {/* PASSO 1 — Seleção de funcionário */}
        {!funcionario && (
          <div className="card-form">
            <h1>Olá! 👋</h1>
            <p className="subtitle">Selecione seu nome para começar.</p>
            <div className="form-group">
              <label>Seu nome</label>
              <select value={funcionario} onChange={(e) => setFuncionario(e.target.value)}>
                <option value="">Selecione...</option>
                {FUNCIONARIOS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* PASSO 2 — Painel do funcionário */}
        {funcionario && (
          <div className="painel">

            {/* Cabeçalho do funcionário */}
            <div className="func-header-card">
              <div className="avatar-lg" style={{ background: cor }}>
                {getInitials(funcionario)}
              </div>
              <div>
                <span className="func-nome">{funcionario}</span>
                <span className="func-status">
                  {atividades.length === 0
                    ? "Nenhuma atividade em andamento"
                    : `${atividades.length} atividade${atividades.length > 1 ? "s" : ""} em andamento`}
                </span>
              </div>
            </div>

            {/* Lista de atividades abertas */}
            {atividades.length > 0 && (
              <div className="ativ-lista">
                {atividades.map((a) => (
                  <div className="ativ-card" key={a.id}>
                    <div className="ativ-card-top">
                      <div className="ativ-info">
                        <span className="ativ-nome">{a.atividade}</span>
                        {a.obs && <span className="ativ-obs">{a.obs}</span>}
                        <span className="ativ-inicio">Início: {formatTime(a.inicio)}</span>
                      </div>
                      <div className="ativ-timer-box">
                        <span className="ativ-timer">{formatDuration(a.inicio?.seconds)}</span>
                        <div className="pulse-dot"/>
                      </div>
                    </div>
                    <button
                      className="btn-encerrar"
                      onClick={() => encerrarAtividade(a.id)}
                      disabled={encerrandoId === a.id}
                    >
                      {encerrandoId === a.id ? "Encerrando..." : "✓ Encerrar atividade"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Botão de nova atividade ou formulário */}
            {!showForm ? (
              <button className="btn-nova" onClick={() => setShowForm(true)}>
                + Nova atividade
              </button>
            ) : (
              <div className="card-form card-form--inline">
                <h2>Nova atividade</h2>
                <div className="form-group">
                  <label>Atividade</label>
                  <select value={form.atividade} onChange={(e) => setForm({ ...form, atividade: e.target.value })}>
                    <option value="">Selecione...</option>
                    {ATIVIDADES.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                {form.atividade && (
                  <div className="form-group">
                    <label>Observação <span className="opt">(opcional)</span></label>
                    <textarea
                      placeholder="Detalhes adicionais..."
                      value={form.obs}
                      onChange={(e) => setForm({ ...form, obs: e.target.value })}
                      rows={2}
                    />
                  </div>
                )}
                <div className="form-actions">
                  <button className="btn-cancelar" onClick={() => { setShowForm(false); setForm({ atividade: "", obs: "" }); }}>
                    Cancelar
                  </button>
                  <button
                    className="btn-iniciar"
                    onClick={iniciarAtividade}
                    disabled={!form.atividade || loading}
                  >
                    {loading ? "Registrando..." : "▶ Iniciar"}
                  </button>
                </div>
              </div>
            )}

          </div>
        )}
      </main>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Inter',system-ui,sans-serif;background:#f1f5f9;min-height:100vh}
        .page{min-height:100vh;display:flex;flex-direction:column}
        .header{background:#0f4c75}
        .header-inner{max-width:600px;margin:0 auto;padding:0 1.5rem;height:60px;display:flex;align-items:center;justify-content:space-between}
        .logo{display:flex;align-items:center;gap:10px}
        .logo-title{display:block;font-size:16px;font-weight:700;color:white;line-height:1.1}
        .logo-sub{display:block;font-size:11px;color:rgba(255,255,255,0.6)}
        .btn-trocar{background:rgba(255,255,255,0.15);color:white;border:1px solid rgba(255,255,255,0.3);border-radius:8px;padding:6px 14px;font-size:13px;cursor:pointer;transition:all 0.15s}
        .btn-trocar:hover{background:rgba(255,255,255,0.25)}
        .main{flex:1;display:flex;align-items:flex-start;justify-content:center;padding:2rem 1rem}
        .card-form{background:white;border-radius:16px;padding:2rem;width:100%;max-width:520px;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
        .card-form--inline{margin-top:0;box-shadow:none;border:1.5px solid #e2e8f0;padding:1.5rem}
        h1{font-size:24px;font-weight:700;color:#0f172a;margin-bottom:6px}
        h2{font-size:18px;font-weight:700;color:#0f172a;margin-bottom:1.25rem}
        .subtitle{color:#64748b;font-size:15px;margin-bottom:1.5rem}
        .form-group{margin-bottom:1.25rem}
        .form-group label{display:block;font-size:14px;font-weight:600;color:#374151;margin-bottom:6px}
        .opt{font-weight:400;color:#94a3b8;font-size:12px}
        .form-group select,.form-group textarea{width:100%;padding:11px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:15px;color:#1e293b;background:#f8fafc;font-family:inherit;transition:border-color 0.15s}
        .form-group select:focus,.form-group textarea:focus{outline:none;border-color:#0f4c75;background:white}
        .form-actions{display:flex;gap:10px}
        .btn-cancelar{flex:1;padding:12px;background:#f1f5f9;color:#64748b;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer}
        .btn-cancelar:hover{background:#e2e8f0}
        .btn-iniciar{flex:2;padding:12px;background:#0f4c75;color:white;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;transition:all 0.15s}
        .btn-iniciar:hover{background:#0a3d5e}
        .btn-iniciar:disabled{opacity:0.5;cursor:not-allowed}
        .painel{width:100%;max-width:520px;display:flex;flex-direction:column;gap:16px}
        .func-header-card{background:white;border-radius:14px;padding:1.25rem 1.5rem;display:flex;align-items:center;gap:14px;box-shadow:0 2px 12px rgba(0,0,0,0.06)}
        .avatar-lg{width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;color:white;flex-shrink:0}
        .func-nome{display:block;font-size:18px;font-weight:700;color:#0f172a}
        .func-status{display:block;font-size:13px;color:#64748b;margin-top:2px}
        .ativ-lista{display:flex;flex-direction:column;gap:12px}
        .ativ-card{background:white;border-radius:14px;padding:1.25rem;border:1.5px solid #bbf7d0;box-shadow:0 2px 12px rgba(0,0,0,0.05)}
        .ativ-card-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1rem;gap:12px}
        .ativ-info{flex:1}
        .ativ-nome{display:block;font-size:15px;font-weight:700;color:#0f172a;margin-bottom:3px}
        .ativ-obs{display:block;font-size:12px;color:#64748b;font-style:italic;margin-bottom:4px}
        .ativ-inicio{display:block;font-size:12px;color:#94a3b8}
        .ativ-timer-box{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0}
        .ativ-timer{font-size:22px;font-weight:700;color:#15803d;font-variant-numeric:tabular-nums;line-height:1}
        .pulse-dot{width:8px;height:8px;border-radius:50%;background:#22c55e;animation:pulse 2s infinite;align-self:flex-end}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.3)}}
        .btn-encerrar{width:100%;padding:11px;background:#f0fdf4;color:#16a34a;border:1.5px solid #86efac;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.15s}
        .btn-encerrar:hover{background:#dcfce7;border-color:#4ade80}
        .btn-encerrar:disabled{opacity:0.5;cursor:not-allowed}
        .btn-nova{width:100%;padding:14px;background:#0f4c75;color:white;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;transition:all 0.15s;letter-spacing:0.01em}
        .btn-nova:hover{background:#0a3d5e;transform:translateY(-1px);box-shadow:0 4px 12px rgba(15,76,117,0.3)}
        @media(max-width:500px){.main{padding:1rem 0.75rem}.card-form{padding:1.5rem}.ativ-timer{font-size:18px}}
      `}</style>
    </div>
  );
}
