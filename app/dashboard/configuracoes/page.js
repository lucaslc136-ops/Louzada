"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, KeyRound, LogOut, Check, Users, Copy, Tag, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { listCustomCategories, createCustomCategory, deleteCustomCategory } from "@/lib/data/categories";
import { GROUP_LABELS, GROUP_ORDER } from "@/lib/finance/core";

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

      <button
        onClick={handleLogout}
        className="flex items-center gap-1.5 text-sm px-3.5 py-2.5 rounded-lg border hover:text-rose-600"
        style={{ borderColor: "var(--border)", color: "var(--ink-soft)" }}
      >
        <LogOut size={15} /> Sair da conta
      </button>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 text-xs px-4 py-2.5 rounded-full text-white shadow-lg z-50 flex items-center gap-1.5" style={{ background: "var(--ink)" }}>
          <Check size={13} /> {toast}
        </div>
      )}
    </div>
  );
}
