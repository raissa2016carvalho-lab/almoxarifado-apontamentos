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
  const [step, setStep] = useState("inicio");
  const [form, setForm] = useState({ funcionario: "", atividade: "", obs: "" });
  const [atividadeAtiva, setAtividadeAtiva] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!form.funcionario) { setAtividadeAtiva(null); return; }
    const q = query(
      collection(db, "apontamentos"),
      where("funcionario", "==", form.funcionario),
      where("status", "==", "ativo")
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setAtividadeAtiva({ id: snap.docs[0].id, ...snap.docs[0].data() });
        setStep("emAndamento");
      } else {
        setAtividadeAtiva(null);
        setStep("inicio");
      }
    });
    return () => unsub();
  }, [form.funcionario]);

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
      setStep("emAndamento");
    } catch (e) {
      alert("Erro: " + e.message);
    }
    setLoading(false);
  }

  async function finalizarAtividade() {
    if (!atividadeAtiva) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "apontamentos", atividadeAtiva.id), {
        fim: serverTimestamp(),
        status: "finalizado",
      });
      setStep("sucesso");
      setTimeout(() => {
        setStep("inicio");
        setForm({ funcionario: "", atividade: "", obs: "" });
        setAtividadeAtiva(null);
      }, 3000);
    } catch (e) {
      alert("Erro: " + e.message);
    }
    setLoading(false);
  }

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
        </div>
      </header>

      <main className="main">
        {step === "inicio" && (
          <div className="card-form">
            <h1>Olá! 👋</h1>
            <p className="subtitle">Selecione seu nome e a atividade que vai iniciar.</p>
            <div className="form-group">
              <label>Seu nome</label>
              <select value={form.funcionario} onChange={(e) => setForm({...form, funcionario: e.target.value, atividade: ""})}>
                <option value="">Selecione...</option>
                {FUNCIONARIOS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            {form.funcionario && (
              <div className="form-group">
                <label>Atividade</label>
                <select value={form.atividade} onChange={(e) => setForm({...form, atividade: e.target.value})}>
                  <option value="">Selecione...</option>
                  {ATIVIDADES.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            )}
            {form.funcionario && form.atividade && (
              <div className="form-group">
                <label>Observação <span className="opt">(opcional)</span></label>
                <textarea placeholder="Detalhes adicionais..." value={form.obs}
                  onChange={(e) => setForm({...form, obs: e.target.value})} rows={3}/>
              </div>
            )}
            <button className="btn-iniciar" onClick={iniciarAtividade}
              disabled={!form.funcionario || !form.atividade || loading}>
              {loading ? "Registrando..." : "▶ Iniciar atividade"}
            </button>
          </div>
        )}

        {step === "emAndamento" && atividadeAtiva && (
          <div className="card-andamento">
            <div className="andamento-header">
              <div className="avatar-lg" style={{background: getColor(atividadeAtiva.funcionario)}}>
                {getInitials(atividadeAtiva.funcionario)}
              </div>
              <div className="pulse-ring"/>
            </div>
            <h2 className="and-nome">{atividadeAtiva.funcionario}</h2>
            <p className="and-ativ">{atividadeAtiva.atividade}</p>
            {atividadeAtiva.obs && <p className="and-obs">{atividadeAtiva.obs}</p>}
            <div className="timer-box">
              <span className="timer-label">Tempo em andamento</span>
              <span className="timer-value">{formatDuration(atividadeAtiva.inicio?.seconds)}</span>
              <span className="timer-inicio">Início: {formatTime(atividadeAtiva.inicio)}</span>
            </div>
            <button className="btn-finalizar" onClick={finalizarAtividade} disabled={loading}>
              {loading ? "Finalizando..." : "✓ Finalizar atividade"}
            </button>
          </div>
        )}

        {step === "sucesso" && (
          <div className="card-sucesso">
            <div className="sucesso-icon">✓</div>
            <h2>Atividade finalizada!</h2>
            <p>Registro salvo com sucesso.</p>
          </div>
        )}
      </main>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Inter',system-ui,sans-serif;background:#f1f5f9;min-height:100vh}
        .page{min-height:100vh;display:flex;flex-direction:column}
        .header{background:#0f4c75}
        .header-inner{max-width:600px;margin:0 auto;padding:0 1.5rem;height:60px;display:flex;align-items:center}
        .logo{display:flex;align-items:center;gap:10px}
        .logo-title{display:block;font-size:16px;font-weight:700;color:white;line-height:1.1}
        .logo-sub{display:block;font-size:11px;color:rgba(255,255,255,0.6)}
        .main{flex:1;display:flex;align-items:center;justify-content:center;padding:2rem 1rem}
        .card-form,.card-andamento,.card-sucesso{background:white;border-radius:16px;padding:2rem;width:100%;max-width:480px;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
        h1{font-size:24px;font-weight:700;color:#0f172a;margin-bottom:6px}
        .subtitle{color:#64748b;font-size:15px;margin-bottom:1.5rem}
        .form-group{margin-bottom:1.25rem}
        .form-group label{display:block;font-size:14px;font-weight:600;color:#374151;margin-bottom:6px}
        .opt{font-weight:400;color:#94a3b8;font-size:12px}
        .form-group select,.form-group textarea{width:100%;padding:11px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:15px;color:#1e293b;background:#f8fafc;font-family:inherit;transition:border-color 0.15s}
        .form-group select:focus,.form-group textarea:focus{outline:none;border-color:#0f4c75;background:white}
        .btn-iniciar{width:100%;padding:14px;background:#0f4c75;color:white;border:none;border-radius:10px;font-size:16px;font-weight:600;cursor:pointer;transition:all 0.15s;margin-top:0.5rem}
        .btn-iniciar:hover{background:#0a3d5e}
        .btn-iniciar:disabled{opacity:0.5;cursor:not-allowed}
        .card-andamento{text-align:center;position:relative}
        .andamento-header{position:relative;display:inline-block;margin-bottom:1.5rem}
        .avatar-lg{width:80px;height:80px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:24px;color:white;margin:0 auto;position:relative;z-index:1}
        .pulse-ring{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:80px;height:80px;border-radius:50%;background:rgba(34,197,94,0.2);animation:pulseRing 2s infinite;z-index:0}
        @keyframes pulseRing{0%{transform:translate(-50%,-50%) scale(1);opacity:0.8}100%{transform:translate(-50%,-50%) scale(1.8);opacity:0}}
        .and-nome{font-size:22px;font-weight:700;color:#0f172a;margin-bottom:4px}
        .and-ativ{font-size:16px;color:#475569;margin-bottom:1.5rem}
        .and-obs{font-size:13px;color:#64748b;background:#f8fafc;border-radius:8px;padding:8px 12px;margin-bottom:1.5rem;border-left:3px solid #e2e8f0;text-align:left}
        .timer-box{background:#f0f7ff;border-radius:12px;padding:1.25rem;margin-bottom:1.5rem}
        .timer-label{display:block;font-size:12px;color:#64748b;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em}
        .timer-value{display:block;font-size:36px;font-weight:700;color:#0f4c75;font-variant-numeric:tabular-nums;line-height:1;margin-bottom:6px}
        .timer-inicio{display:block;font-size:13px;color:#94a3b8}
        .btn-finalizar{width:100%;padding:14px;background:#16a34a;color:white;border:none;border-radius:10px;font-size:16px;font-weight:600;cursor:pointer;transition:all 0.15s}
        .btn-finalizar:hover{background:#15803d}
        .btn-finalizar:disabled{opacity:0.5;cursor:not-allowed}
        .card-sucesso{text-align:center;padding:3rem 2rem}
        .sucesso-icon{width:72px;height:72px;border-radius:50%;background:#22c55e;color:white;font-size:32px;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem}
        .card-sucesso h2{font-size:22px;font-weight:700;color:#16a34a;margin-bottom:8px}
        .card-sucesso p{color:#64748b}
        @media(max-width:500px){.card-form,.card-andamento,.card-sucesso{padding:1.5rem}.timer-value{font-size:28px}}
      `}</style>
    </div>
  );
}
