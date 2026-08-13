# Planejamento Financeiro Família Louzada

Base do site: login com senha de verdade, banco de dados de verdade, dados
compartilhados entre quem estiver na mesma família. Sem depender de artefato do Claude.

## O que já está pronto nesta base

- Cadastro e login (Supabase Auth)
- Criar uma família ou entrar em uma existente com código de convite
- Banco de dados com as tabelas de contas, lançamentos, dívidas e configurações,
  já protegido por família (uma família nunca vê os dados de outra)
- Layout do dashboard com cabeçalho, código de convite e logout

## O que ainda falta (próximos passos, depois que isso estiver no ar)

- Portar as telas de Lançamentos, Contas & Cartões, Dívidas
- Portar o Dashboard com os gráficos (Visão Geral, Fluxo de Caixa, Despesas,
  Orçamento 50/30/20, Cartões, Dívidas, Primeiro Imóvel, Patrimônio)

## Passo a passo para colocar no ar

### 1. Rodar o banco de dados no Supabase

1. Abra seu projeto em [supabase.com](https://supabase.com).
2. Vá em **SQL Editor** (menu lateral) → **New query**.
3. Abra o arquivo `supabase/schema.sql` desta pasta, copie tudo, cole no editor.
4. Clique em **Run**. Deve aparecer "Success. No rows returned".

### 2. Pegar as chaves do Supabase

1. No seu projeto Supabase: **Project Settings** (ícone de engrenagem) → **API**.
2. Copie o **Project URL** e a chave **anon public**.

### 3. Colocar o código no GitHub

1. Crie um repositório novo em [github.com/new](https://github.com/new) (pode ser privado).
2. Suba os arquivos desta pasta para esse repositório (pelo site do GitHub mesmo,
   arrastando os arquivos, ou usando `git` se preferir).

### 4. Publicar na Vercel

1. Em [vercel.com](https://vercel.com), clique em **Add New** → **Project**.
2. Escolha o repositório que você acabou de criar.
3. Antes de clicar em Deploy, abra **Environment Variables** e adicione:
   - `NEXT_PUBLIC_SUPABASE_URL` → o Project URL que você copiou
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → a chave anon public que você copiou
4. Clique em **Deploy**. Em cerca de 1 minuto você recebe um link
   (algo como `planejamento-louzada.vercel.app`).

### 5. Testar

1. Abra o link que a Vercel te deu.
2. Crie sua conta (nome, e-mail, senha).
3. Crie a família (dê um nome, ex: "Família Louzada").
4. Você vai cair numa tela confirmando que o login e o banco de dados estão
   funcionando.
5. Para sua namorada entrar: ela cria a conta dela nesse mesmo link, e ao invés
   de "Criar família" ela escolhe "Entrar com código" — o código fica no
   cabeçalho do dashboard depois que você estiver logado.

## Rodando localmente (opcional, se você quiser mexer no código no seu computador)

```bash
npm install
cp .env.local.example .env.local   # depois preencha com suas chaves do Supabase
npm run dev
```

Abre em http://localhost:3000
