# 📦 Almoxarifado — Sistema de Apontamentos

Sistema para registrar o início e fim de atividades dos funcionários do almoxarifado, com painel em tempo real.

---

## 🚀 Stack

- **Next.js 14** (App Router) — frontend e build
- **Firebase Firestore** — banco de dados em tempo real
- **Vercel** — hospedagem com deploy automático pelo GitHub

---

## 📋 Passo a Passo Completo

### 1. Firebase — Criar projeto

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Clique em **"Adicionar projeto"** → dê o nome `almoxarifado-apontamentos`
3. Desative o Google Analytics (opcional) → **Criar projeto**

#### Criar o banco Firestore
1. No menu lateral: **Build → Firestore Database**
2. Clique em **"Criar banco de dados"**
3. Escolha **"Iniciar no modo de produção"** (as regras já estão no arquivo `firestore.rules`)
4. Selecione a região mais próxima (ex: `us-central1` ou `southamerica-east1`)
5. Clique em **Ativar**

#### Obter as credenciais do app
1. No menu lateral: ⚙️ **Configurações do projeto**
2. Na aba **"Geral"**, role até **"Seus apps"**
3. Clique em **"</>  Web"**
4. Registre o app com o nome `almoxarifado-web`
5. Copie o objeto `firebaseConfig` — você vai precisar dele no próximo passo

#### Publicar as regras de segurança
1. No menu do Firestore: aba **"Regras"**
2. Substitua o conteúdo pelo que está em `firestore.rules`
3. Clique em **Publicar**

#### Criar os índices necessários
1. Aba **"Índices"** no Firestore
2. Clique em **"Índices compostos"** → **"Adicionar índice"**
3. Crie dois índices conforme `firestore.indexes.json`:

   **Índice 1:**
   - Coleção: `apontamentos`
   - Campo 1: `status` (Crescente)
   - Campo 2: `inicio` (Decrescente)

   **Índice 2:**
   - Coleção: `apontamentos`
   - Campo 1: `status` (Crescente)
   - Campo 2: `fim` (Decrescente)

---

### 2. Projeto local — Configurar

```bash
# Clone ou crie o repositório
git init
git add .
git commit -m "feat: sistema de apontamentos almoxarifado"

# Instale as dependências
npm install

# Copie o arquivo de variáveis de ambiente
cp .env.example .env.local
```

Edite o arquivo `.env.local` com os dados do Firebase:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=almoxarifado-xxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=almoxarifado-xxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=almoxarifado-xxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abcdef
```

Teste localmente:
```bash
npm run dev
# Acesse http://localhost:3000
```

---

### 3. GitHub — Subir o projeto

```bash
# Crie um repositório no GitHub (github.com → New repository)
# Nome sugerido: almoxarifado-apontamentos

git remote add origin https://github.com/SEU_USUARIO/almoxarifado-apontamentos.git
git branch -M main
git push -u origin main
```

> ⚠️ O `.env.local` está no `.gitignore` — suas credenciais NÃO serão enviadas para o GitHub.

---

### 4. Vercel — Deploy

1. Acesse [vercel.com](https://vercel.com) → **"Add New Project"**
2. Importe o repositório do GitHub que você criou
3. **Configure as variáveis de ambiente** (mesmo conteúdo do `.env.local`):
   - Vá em **"Environment Variables"** antes de fazer o deploy
   - Adicione cada variável `NEXT_PUBLIC_FIREBASE_*` com seu valor
4. Clique em **"Deploy"**
5. Pronto! A Vercel vai gerar uma URL do tipo `almoxarifado-xxx.vercel.app`

#### Deploy automático
A partir daqui, qualquer `git push` para a branch `main` vai publicar uma nova versão automaticamente.

---

## ✏️ Personalizar funcionários e atividades

Edite o arquivo `src/app/page.js`, no início:

```js
const FUNCIONARIOS = [
  "Carlos Silva",
  "Ana Rodrigues",
  // adicione ou remova nomes aqui
];

const ATIVIDADES = [
  "Recebimento de mercadorias",
  "Conferência de estoque",
  // adicione ou remova atividades aqui
];
```

---

## 🗂️ Estrutura do banco de dados (Firestore)

Coleção: `apontamentos`

| Campo       | Tipo      | Descrição                        |
|-------------|-----------|----------------------------------|
| funcionario | string    | Nome do funcionário              |
| atividade   | string    | Nome da atividade                |
| obs         | string    | Observação opcional              |
| inicio      | timestamp | Hora de início (automático)      |
| fim         | timestamp | Hora de fim (ao clicar Finalizar)|
| status      | string    | `"ativo"` ou `"finalizado"`      |

---

## 📱 Funcionalidades

- ✅ **Painel em tempo real** — mostra quem está fazendo o quê agora
- ✅ **Cronômetro ao vivo** — tempo decorrido de cada atividade
- ✅ **Registro de início e fim** — salvo no Firestore
- ✅ **Histórico com duração** — todas as atividades finalizadas
- ✅ **Filtro por funcionário** no histórico
- ✅ **Responsivo** — funciona no celular

---

## 🛠️ Comandos úteis

```bash
npm run dev      # desenvolvimento local
npm run build    # build de produção
npm run start    # rodar build localmente
```
