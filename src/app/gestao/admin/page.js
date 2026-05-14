"use client";
import { useState, useEffect } from "react";
import {
  collection, addDoc, deleteDoc, doc, onSnapshot, updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const SENHA_GESTAO = "gestao2024";

export default function AdminPage() {
  const [autenticado, setAutenticado] = useState(false);
  const [senhaInput, setSenhaInput] = useState("");
  const [erroSenha, setErroSenha] = useState(false);
  const [funcionarios, setFuncionarios] = useState([]);
  const [form, setForm] = useState({ nome: "", email: "", senha: "" });
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "funcionarios"), (snap) => {
      setFuncionarios(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  function verificarSenha() {
    if (senhaInput === SENHA_GESTAO) {
      setAutenticado(true);
    } else {
      setErroSenha(true);
      setTimeout(() => setErroSenha(false), 2000);
    }
  }

  async function cadastrarFuncionario() {
    if (!form.nome || !form.email || !form.senha) return;
    setLoading(true);
    setErro("");
    setSucesso("");
    try {
      // Cria via API do Firebase Admin (usando fetch para a API REST)
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email, password: form.senha, returnSecureToken: true }),
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      // Salva perfil no Firestore
      await addDoc(collection(db, "funcionarios"), {
        uid: data.localId,
        nome: form.nome,
        email: form.email,
        ativo: true,
        criadoEm: new Date().toISOString(),
      });

      setSucesso(`Funcionário "${form.nome}" cadastrado com sucesso!`);
      setForm({ nome: "", email: "", senha: "" });
      setTimeout(() => setSucesso(""), 4000);
    } catch (e) {
      const msg = e.message.includes("EMAIL_EXISTS")
        ? "Este email já está cadastrado."
        : e.message.includes("WEAK_PASSWORD")
        ? "Senha fraca. Use pelo menos 6 caracteres."
        : "Erro ao cadastrar: " + e.message;
      setErro(msg);
    }
    setLoading(false);
  }

  async function toggleAtivo(f) {
    await updateDoc(doc(db, "funcionarios", f.id), { ativo: !f.ativo });
  }

  async function removerFuncionario(f) {
    if (!confirm(`Remover "${f.nome}"? O histórico de atividades será mantido.`)) return;
    await deleteDoc(doc(db, "funcionarios", f.id));
  }

  if (!autenticado) {
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
                <span className="logo-sub">Admin</span>
              </div>
            </div>
          </div>
        </header>
        <main className="main">
          <div className="card-login">
            <h1>🔐 Área Admin</h1>
            <p className="subtitle">Digite a senha de acesso.</p>
            <div className="form-group">
              <label>Senha de admin</label>
              <input
                type="password" placeholder="••••••••"
                value={senhaInput}
                onChange={(e) => setSenhaInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && verificarSenha()}
                className={erroSenha ? "input-erro" : ""}
              />
              {erroSenha && <span className="erro-msg">Senha incorreta</span>}
            </div>
            <button className="btn-primary" onClick={verificarSenha}>Entrar</button>
          </div>
        </main>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="page-admin">
      <header className="header">
        <div className="header-inner wide">
          <div className="logo">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="#0f4c75"/>
              <rect x="5" y="8" width="18" height="3" rx="1.5" fill="white"/>
              <rect x="5" y="13" width="12" height="3" rx="1.5" fill="white" opacity="0.7"/>
              <rect x="5" y="18" width="15" height="3" rx="1.5" fill="white" opacity="0.5"/>
            </svg>
            <div>
              <span className="logo-title">Almoxarifado</span>
              <span className="logo-sub">Gerenciar Funcionários</span>
            </div>
          </div>
          <a href="/gestao" className="btn-voltar">← Voltar ao painel</a>
        </div>
      </header>

      <main className="main-admin">
        <div className="admin-grid">

          {/* Formulário de cadastro */}
          <div className="form-card">
            <h2>➕ Novo funcionário</h2>
            <p className="form-sub">Crie o login para um funcionário acessar o sistema.</p>

            <div className="form-group">
              <label>Nome completo</label>
              <input type="text" placeholder="Ex: João da Silva" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Email de acesso</label>
              <input type="email" placeholder="Ex: joao@alm.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Senha</label>
              <input type="text" placeholder="Mínimo 6 caracteres" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} />
              <span className="campo-hint">Anote e entregue ao funcionário</span>
            </div>

            {sucesso && <div className="msg-sucesso">✓ {sucesso}</div>}
            {erro && <div className="msg-erro">✗ {erro}</div>}

            <button
              className="btn-primary"
              onClick={cadastrarFuncionario}
              disabled={!form.nome || !form.email || !form.senha || loading}
            >
              {loading ? "Cadastrando..." : "Cadastrar funcionário"}
            </button>
          </div>

          {/* Lista de funcionários */}
          <div className="lista-card">
            <h2>👥 Funcionários cadastrados <span className="count-badge">{funcionarios.length}</span></h2>
            {funcionarios.length === 0 ? (
              <p className="empty-lista">Nenhum funcionário cadastrado ainda.</p>
            ) : (
              <div className="func-lista">
                {funcionarios.map((f) => (
                  <div className={`func-item ${!f.ativo ? "inativo" : ""}`} key={f.id}>
                    <div className="func-avatar" style={{ background: getColor(f.nome) }}>
                      {getInitials(f.nome)}
                    </div>
                    <div className="func-dados">
                      <span className="func-nome">{f.nome}</span>
                      <span className="func-email">{f.email}</span>
                    </div>
                    <div className="func-acoes">
                      <button
                        className={`btn-toggle ${f.ativo ? "ativo" : "inativo"}`}
                        onClick={() => toggleAtivo(f)}
                        title={f.ativo ? "Desativar" : "Ativar"}
                      >
                        {f.ativo ? "Ativo" : "Inativo"}
                      </button>
                      <button className="btn-remover" onClick={() => removerFuncionario(f)} title="Remover">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <style>{styles}</style>
    </div>
  );
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

const styles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', system-ui, sans-serif; background: #f1f5f9; min-height: 100vh; }
  .page, .page-admin { min-height: 100vh; display: flex; flex-direction: column; }
  .header { background: #0f4c75; }
  .header-inner { max-width: 600px; margin: 0 auto; padding: 0 1.5rem; height: 60px; display: flex; align-items: center; justify-content: space-between; }
  .header-inner.wide { max-width: 1100px; }
  .logo { display: flex; align-items: center; gap: 10px; }
  .logo-title { display: block; font-size: 16px; font-weight: 700; color: white; line-height: 1.1; }
  .logo-sub { display: block; font-size: 11px; color: rgba(255,255,255,0.6); }
  .btn-voltar { color: rgba(255,255,255,0.8); font-size: 13px; text-decoration: none; background: rgba(255,255,255,0.1); padding: 6px 12px; border-radius: 6px; }
  .btn-voltar:hover { background: rgba(255,255,255,0.2); }
  .main { flex: 1; display: flex; align-items: center; justify-content: center; padding: 2rem 1rem; }
  .main-admin { flex: 1; padding: 2rem 1.5rem; max-width: 1100px; margin: 0 auto; width: 100%; }
  .card-login { background: white; border-radius: 16px; padding: 2rem; width: 100%; max-width: 400px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  h1 { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 6px; }
  .subtitle { color: #64748b; font-size: 14px; margin-bottom: 1.5rem; }
  .form-group { margin-bottom: 1.1rem; }
  .form-group label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 5px; }
  .form-group input { width: 100%; padding: 10px 14px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 14px; color: #1e293b; background: #f8fafc; font-family: inherit; transition: border-color 0.15s; }
  .form-group input:focus { outline: none; border-color: #0f4c75; background: white; }
  .form-group input.input-erro { border-color: #ef4444; }
  .erro-msg { display: block; font-size: 12px; color: #ef4444; margin-top: 4px; }
  .campo-hint { display: block; font-size: 11px; color: #94a3b8; margin-top: 4px; }
  .btn-primary { width: 100%; padding: 12px; background: #0f4c75; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
  .btn-primary:hover { background: #0a3d5e; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .admin-grid { display: grid; grid-template-columns: 380px 1fr; gap: 24px; align-items: start; }
  @media (max-width: 800px) { .admin-grid { grid-template-columns: 1fr; } }
  .form-card, .lista-card { background: white; border-radius: 12px; padding: 1.5rem; border: 1px solid #e2e8f0; }
  .form-card h2, .lista-card h2 { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; }
  .form-sub { font-size: 13px; color: #94a3b8; margin-bottom: 1.25rem; }
  .count-badge { background: #0f4c75; color: white; border-radius: 20px; padding: 1px 8px; font-size: 12px; font-weight: 600; }
  .msg-sucesso { background: #f0fdf4; border: 1px solid #bbf7d0; color: #16a34a; border-radius: 8px; padding: 10px 12px; font-size: 13px; margin-bottom: 1rem; }
  .msg-erro { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; border-radius: 8px; padding: 10px 12px; font-size: 13px; margin-bottom: 1rem; }
  .empty-lista { color: #94a3b8; font-size: 14px; padding: 1.5rem 0; text-align: center; }
  .func-lista { display: flex; flex-direction: column; gap: 10px; margin-top: 1rem; }
  .func-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 8px; border: 1px solid #e2e8f0; background: #fafafa; }
  .func-item.inativo { opacity: 0.5; }
  .func-avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; color: white; flex-shrink: 0; }
  .func-dados { flex: 1; }
  .func-nome { display: block; font-size: 14px; font-weight: 600; color: #0f172a; }
  .func-email { display: block; font-size: 12px; color: #94a3b8; }
  .func-acoes { display: flex; align-items: center; gap: 6px; }
  .btn-toggle { padding: 4px 10px; border-radius: 20px; border: none; font-size: 12px; font-weight: 600; cursor: pointer; }
  .btn-toggle.ativo { background: #dcfce7; color: #16a34a; }
  .btn-toggle.inativo { background: #f1f5f9; color: #94a3b8; }
  .btn-remover { width: 28px; height: 28px; border-radius: 50%; border: none; background: #fef2f2; color: #ef4444; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .btn-remover:hover { background: #fee2e2; }
`;
