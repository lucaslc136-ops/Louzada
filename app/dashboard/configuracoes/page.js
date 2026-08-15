"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, KeyRound, LogOut, Check, Users, Copy, Tag, Plus, Trash2, Landmark, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { listAccounts } from "@/lib/data/accounts";
import { listCustomCategories, createCustomCategory, deleteCustomCategory } from "@/lib/data/categories";
import { previewTransactionsDeletion, deleteTransactionsByScope } from "@/lib/data/transactions";
import { GROUP_LABELS, GROUP_ORDER, formatBRL } from "@/lib/finance/core";

export default function ConfiguracoesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [householdId, setHouseholdId] = useState(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [copyMsg, setCopyMsg] = useState("");

  const [customCategories, setCustomCategories] = useState([]);
  const [newCatName, setNewCatName] = useState("");
  const [newCatGroup, setNewCatGroup] = useState("necessidades");
  const [newCatSubs, setNewCatSubs] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  const [pluggyItemId, setPluggyItemId] = useState("");
  const [testingPluggy, setTestingPluggy] = useState(false);
  const [pluggyResult, setPluggyResult] = useState(null);

  const [accounts, setAccounts] = useState([]);
  const [deleteScope, setDeleteScope] = useState(null); // { type: "hoje" | "conta" | "tudo", accountId? }
  const [deletePreview, setDeletePreview] = useState(null); // { count, total }
  const [deleteAccountChoice, setDeleteAccountChoice] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [loadingDeletePreview, setLoadingDeletePreview] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [toast, setToast] = useState("");

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || "");
        setName(user.user_metadata?.full_name || "");

        const { data: membership } = await supabase
          .from("household_members")
          .select("household_id, households(name, invite_code)")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        if (membership) {
          setHouseholdId(membership.household_id);
          setHouseholdName(membership.households?.name || "");
          setInviteCode(membership.households?.invite_code || "");
          const cats = await listCustomCategories(supabase, membership.household_id);
          setCustomCategories(cats);
          const accs = await listAccounts(supabase, membership.household_id);
          setAccounts(accs);
        }
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopyMsg("Copiado!");
    } catch {
      setCopyMsg(`Código: ${inviteCode}`);
    }
    setTimeout(() => setCopyMsg(""), 3000);
  }

  async function handleSaveName(e) {
    e.preventDefault();
    if (!name.trim()) { showToast("Informe um nome."); return; }
    setSavingName(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: name.trim() } });
      if (error) throw error;
      showToast("Nome atualizado.");
    } catch {
      showToast("Não consegui atualizar o nome.");
    } finally {
      setSavingName(false);
    }
  }

  async function openDeleteConfirm(scope) {
    setDeleteScope(scope);
    setDeletePreview(null);
    setConfirmText("");
    setLoadingDeletePreview(true);
    try {
      const preview = await previewTransactionsDeletion(supabase, householdId, scope);
      setDeletePreview(preview);
    } catch {
      showToast("Não consegui calcular o que seria apagado.");
      setDeleteScope(null);
    } finally {
      setLoadingDeletePreview(false);
    }
  }

  function closeDeleteConfirm() {
    setDeleteScope(null);
    setDeletePreview(null);
    setDeleteAccountChoice("");
    setConfirmText("");
  }

  async function handleConfirmDelete() {
    if (deleteScope.type === "tudo" && confirmText.trim().toUpperCase() !== "EXCLUIR") {
      showToast('Digite "EXCLUIR" pra confirmar.');
      return;
    }
    setDeleting(true);
    try {
      await deleteTransactionsByScope(supabase, householdId, deleteScope);
      showToast(`${deletePreview.count} lançamento(s) excluído(s).`);
      closeDeleteConfirm();
    } catch {
      showToast("Não consegui excluir. Tente novamente.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleTestPluggyConnection() {
    if (!pluggyItemId.trim()) { showToast("Cole o ID da conexão primeiro."); return; }
    setTestingPluggy(true);
    setPluggyResult(null);
    try {
      const res = await fetch(`/api/pluggy/test-connection?itemId=${encodeURIComponent(pluggyItemId.trim())}`);
      const data = await res.json();
      setPluggyResult(data);
    } catch {
      setPluggyResult({ error: "Não consegui falar com o servidor." });
    } finally {
      setTestingPluggy(false);
    }
  }

  async function handleAddCategory(e) {
    e.preventDefault();
    if (!newCatName.trim()) { showToast("Dê um nome pra categoria."); return; }
    setSavingCategory(true);
    try {
      const subs = newCatSubs.split(",").map((s) => s.trim()).filter(Boolean);
      const created = await createCustomCategory(supabase, householdId, { name: newCatName.trim(), group_name: newCatGroup, subcategories: subs });
      setCustomCategories((prev) => (prev.some((c) => c.id === created.id) ? prev : [...prev, created]));
      setNewCatName("");
      setNewCatSubs("");
      showToast("Categoria criada.");
    } catch {
      showToast("Não consegui criar a categoria.");
    } finally {
      setSavingCategory(false);
    }
  }

  async function handleDeleteCategory(cat) {
    if (!window.confirm(`Excluir a categoria "${cat.name}"? Lançamentos que já usam ela continuam existindo, só não vai mais aparecer pra escolher em novos lançamentos.`)) return;
    try {
      await deleteCustomCategory(supabase, cat.id);
      setCustomCategories((prev) => prev.filter((c) => c.id !== cat.id));
      showToast("Categoria excluída.");
    } catch {
      showToast("Não consegui excluir essa categoria.");
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (novaSenha.length < 6) { showToast("A nova senha precisa ter pelo menos 6 caracteres."); return; }
    if (novaSenha !== confirmarSenha) { showToast("As senhas não coincidem."); return; }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) throw error;
      setNovaSenha("");
      setConfirmarSenha("");
      showToast("Senha alterada com sucesso.");
    } catch {
      showToast("Não consegui alterar a senha. Tente novamente.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (loading) return <p className="text-sm" style={{ color: "var(--ink-soft)" }}>Carregando…</p>;

  return (
    <div className="space-y-5 max-w-md">
      <div>
        <h1 className="font-serif text-2xl" style={{ color: "var(--ink)" }}>Configurações</h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>Sua conta — nome, e-mail e senha.</p>
      </div>

      <form onSubmit={handleSaveName} className="rounded-xl border bg-white p-4 space-y-3" style={{ borderColor: "var(--border)" }}>
        <p className="text-sm font-medium flex items-center gap-1.5" style={{ color: "var(--ink)" }}><User size={15} /> Seu nome</p>
        <input
          value={name} onChange={(e) => setName(e.target.value)}
          className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }}
        />
        <button type="submit" disabled={savingName} className="text-sm px-3.5 py-2 rounded-lg text-white disabled:opacity-60" style={{ background: "var(--ink)" }}>
          {savingName ? "Salvando…" : "Salvar nome"}
        </button>
      </form>

      <div className="rounded-xl border bg-white p-4" style={{ borderColor: "var(--border)" }}>
        <p className="text-sm font-medium flex items-center gap-1.5 mb-2" style={{ color: "var(--ink)" }}><Mail size={15} /> E-mail</p>
        <p className="text-sm" style={{ color: "var(--ink-soft)" }}>{email}</p>
        <p className="text-xs mt-1.5" style={{ color: "var(--ink-soft)" }}>Trocar o e-mail de login ainda não está disponível por aqui.</p>
      </div>

      <div className="rounded-xl border bg-white p-4" style={{ borderColor: "var(--border)" }}>
        <p className="text-sm font-medium flex items-center gap-1.5 mb-2" style={{ color: "var(--ink)" }}><Users size={15} /> {householdName || "Sua família"}</p>
        <p className="text-xs mb-3" style={{ color: "var(--ink-soft)" }}>Compartilhe esse código com quem você quer que veja os mesmos dados.</p>
        <button
          onClick={copyInvite}
          className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border font-mono"
          style={{ borderColor: "var(--border)", color: "var(--ink)" }}
        >
          <Copy size={13} /> {copyMsg || inviteCode}
        </button>
      </div>

      <div className="rounded-xl border bg-white p-4" style={{ borderColor: "var(--border)" }}>
        <p className="text-sm font-medium flex items-center gap-1.5 mb-1" style={{ color: "var(--ink)" }}><Tag size={15} /> Categorias personalizadas</p>
        <p className="text-xs mb-3" style={{ color: "var(--ink-soft)" }}>Além das categorias padrão do app, crie as suas. Aparecem junto nos lançamentos.</p>

        {customCategories.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {customCategories.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-xs rounded-lg px-3 py-2" style={{ background: "var(--paper)" }}>
                <span>
                  <strong style={{ color: "var(--ink)" }}>{c.name}</strong>
                  <span style={{ color: "var(--ink-soft)" }}> · {GROUP_LABELS[c.group_name] || c.group_name}{c.subcategories?.length ? ` · ${c.subcategories.join(", ")}` : ""}</span>
                </span>
                <button onClick={() => handleDeleteCategory(c)} className="text-slate-400 hover:text-rose-600 shrink-0 ml-2"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAddCategory} className="space-y-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Nome (ex: Pet)" className="text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }}
            />
            <select value={newCatGroup} onChange={(e) => setNewCatGroup(e.target.value)} className="text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }}>
              {GROUP_ORDER.map((g) => <option key={g} value={g}>{GROUP_LABELS[g]}</option>)}
              <option value="receita">Receita</option>
            </select>
          </div>
          <input
            value={newCatSubs} onChange={(e) => setNewCatSubs(e.target.value)}
            placeholder="Subcategorias, separadas por vírgula (opcional)"
            className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }}
          />
          <button type="submit" disabled={savingCategory} className="text-sm px-3.5 py-2 rounded-lg text-white flex items-center gap-1.5 disabled:opacity-60" style={{ background: "var(--ink)" }}>
            <Plus size={13} /> {savingCategory ? "Criando…" : "Adicionar categoria"}
          </button>
        </form>
      </div>

      <div className="rounded-xl border bg-white p-4" style={{ borderColor: "var(--border)" }}>
        <p className="text-sm font-medium flex items-center gap-1.5 mb-1" style={{ color: "var(--ink)" }}><Landmark size={15} /> Conectar banco (teste)</p>
        <p className="text-xs mb-3" style={{ color: "var(--ink-soft)" }}>
          Cole o ID de uma conexão do seu Dashboard da Pluggy pra testar se está tudo certo — isso só consulta os dados, não importa nada ainda.
        </p>
        <div className="flex gap-2 mb-3">
          <input
            value={pluggyItemId} onChange={(e) => setPluggyItemId(e.target.value)}
            placeholder="ID da conexão (ex: a0922d6f-2007-...)"
            className="flex-1 text-sm px-3 py-2 rounded-lg border font-mono" style={{ borderColor: "var(--border)" }}
          />
          <button
            onClick={handleTestPluggyConnection} disabled={testingPluggy}
            className="text-sm px-3.5 py-2 rounded-lg text-white disabled:opacity-60 shrink-0" style={{ background: "var(--ink)" }}
          >
            {testingPluggy ? "Testando…" : "Testar conexão"}
          </button>
        </div>
        {pluggyResult && pluggyResult.error && (
          <p className="text-xs rounded-lg px-3 py-2" style={{ background: "#fdf1ef", color: "var(--rose)" }}>{pluggyResult.error}</p>
        )}
        {pluggyResult && !pluggyResult.error && (
          <div className="space-y-1.5">
            <p className="text-xs" style={{ color: "var(--teal)" }}>Conectado: {pluggyResult.conector} (status: {pluggyResult.status})</p>
            {pluggyResult.contas.map((c) => (
              <div key={c.pluggyAccountId} className="text-xs rounded-lg px-3 py-2 flex justify-between" style={{ background: "var(--paper)" }}>
                <span>{c.name} <span style={{ color: "var(--ink-soft)" }}>({c.tipoSugerido})</span></span>
                <span className="font-mono">{c.saldo != null ? `R$ ${c.saldo.toFixed(2)}` : "—"}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleChangePassword} className="rounded-xl border bg-white p-4 space-y-3" style={{ borderColor: "var(--border)" }}>
        <p className="text-sm font-medium flex items-center gap-1.5" style={{ color: "var(--ink)" }}><KeyRound size={15} /> Alterar senha</p>
        <label className="block">
          <span className="block text-xs mb-1" style={{ color: "var(--ink-soft)" }}>Nova senha</span>
          <input
            type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)}
            autoComplete="new-password" className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }}
          />
        </label>
        <label className="block">
          <span className="block text-xs mb-1" style={{ color: "var(--ink-soft)" }}>Confirmar nova senha</span>
          <input
            type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)}
            autoComplete="new-password" className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }}
          />
        </label>
        <button type="submit" disabled={savingPassword} className="text-sm px-3.5 py-2 rounded-lg text-white disabled:opacity-60" style={{ background: "var(--ink)" }}>
          {savingPassword ? "Salvando…" : "Alterar senha"}
        </button>
      </form>

      <div className="rounded-xl border-2 p-4" style={{ borderColor: "#f3c6bc", background: "#fdf6f4" }}>
        <p className="text-sm font-medium flex items-center gap-1.5 mb-1" style={{ color: "var(--rose)" }}><AlertTriangle size={15} /> Zona de risco</p>
        <p className="text-xs mb-3" style={{ color: "var(--ink-soft)" }}>Excluir lançamentos. Essas ações não podem ser desfeitas.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            onClick={() => openDeleteConfirm({ type: "hoje" })}
            className="text-xs px-3 py-2.5 rounded-lg border text-left" style={{ borderColor: "var(--border)", color: "var(--ink)" }}
          >
            <span className="block font-medium">Lançamentos de hoje</span>
            <span style={{ color: "var(--ink-soft)" }}>Só o que você digitou hoje</span>
          </button>
          <div className="rounded-lg border p-2.5" style={{ borderColor: "var(--border)" }}>
            <span className="block text-xs font-medium mb-1.5" style={{ color: "var(--ink)" }}>De uma conta específica</span>
            <select
              value={deleteAccountChoice}
              onChange={(e) => { setDeleteAccountChoice(e.target.value); if (e.target.value) openDeleteConfirm({ type: "conta", accountId: e.target.value }); }}
              className="w-full text-xs px-2 py-1.5 rounded border" style={{ borderColor: "var(--border)" }}
            >
              <option value="">Escolher conta…</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <button
            onClick={() => openDeleteConfirm({ type: "tudo" })}
            className="text-xs px-3 py-2.5 rounded-lg border text-left" style={{ borderColor: "var(--rose)", color: "var(--rose)" }}
          >
            <span className="block font-medium">Todos os lançamentos</span>
            <span style={{ color: "var(--rose)", opacity: 0.8 }}>Apaga tudo, de todas as contas</span>
          </button>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="flex items-center gap-1.5 text-sm px-3.5 py-2.5 rounded-lg border hover:text-rose-600"
        style={{ borderColor: "var(--border)", color: "var(--ink-soft)" }}
      >
        <LogOut size={15} /> Sair da conta
      </button>

      {deleteScope && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(20,32,46,0.5)" }}>
          <div className="bg-white rounded-xl p-5 max-w-sm w-full">
            <p className="text-sm font-medium flex items-center gap-1.5 mb-3" style={{ color: "var(--rose)" }}>
              <AlertTriangle size={16} /> Confirmar exclusão
            </p>

            {loadingDeletePreview ? (
              <p className="text-sm" style={{ color: "var(--ink-soft)" }}>Calculando…</p>
            ) : deletePreview ? (
              <>
                <p className="text-sm mb-1" style={{ color: "var(--ink)" }}>
                  {deleteScope.type === "hoje" && "Isso vai apagar os lançamentos que você criou hoje:"}
                  {deleteScope.type === "conta" && `Isso vai apagar todos os lançamentos da conta "${accounts.find((a) => a.id === deleteScope.accountId)?.name}":`}
                  {deleteScope.type === "tudo" && "Isso vai apagar TODOS os lançamentos de TODAS as contas da família:"}
                </p>
                <p className="text-sm font-medium mb-3" style={{ color: "var(--rose)" }}>
                  {deletePreview.count} lançamento(s), somando {formatBRL(deletePreview.total)}
                </p>
                <p className="text-xs mb-4" style={{ color: "var(--ink-soft)" }}>Essa ação não pode ser desfeita.</p>

                {deleteScope.type === "tudo" && (
                  <label className="block mb-4">
                    <span className="block text-xs mb-1" style={{ color: "var(--ink-soft)" }}>Digite <strong>EXCLUIR</strong> pra confirmar</span>
                    <input
                      value={confirmText} onChange={(e) => setConfirmText(e.target.value)}
                      className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }}
                    />
                  </label>
                )}

                <div className="flex gap-2">
                  <button onClick={closeDeleteConfirm} className="flex-1 text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)", color: "var(--ink)" }}>
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmDelete} disabled={deleting || deletePreview.count === 0}
                    className="flex-1 text-sm px-3 py-2 rounded-lg text-white disabled:opacity-50" style={{ background: "var(--rose)" }}
                  >
                    {deleting ? "Excluindo…" : "Sim, excluir"}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 text-xs px-4 py-2.5 rounded-full text-white shadow-lg z-50 flex items-center gap-1.5" style={{ background: "var(--ink)" }}>
          <Check size={13} /> {toast}
        </div>
      )}
    </div>
  );
}
