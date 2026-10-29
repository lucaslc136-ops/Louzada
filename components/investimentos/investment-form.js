"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { INVESTMENT_KINDS } from "@/lib/finance/investments";
import { parseBRNumber } from "@/lib/finance/core";

// Cadastro e edição de uma aplicação. Na edição, valores (aplicado e atual) não aparecem aqui:
// mudam por aporte, resgate ou atualização de valor, que deixam histórico.
export default function InvestmentForm({ inv, onSave, onClose, busy }) {
  const editando = !!inv;
  const [name, setName] = useState(inv?.name || "");
  const [kind, setKind] = useState(inv?.kind || "tesouro_selic");
  const [institution, setInstitution] = useState(inv?.institution || "");
  const [aplicado, setAplicado] = useState("");
  const [atual, setAtual] = useState("");
  const [taxa, setTaxa] = useState(inv?.taxa_anual != null ? String(inv.taxa_anual).replace(".", ",") : "");
  const [vencimento, setVencimento] = useState(inv?.vencimento || "");
  const [reserva, setReserva] = useState(!!inv?.reserva);
  const [erro, setErro] = useState("");

  function submit(e) {
    e.preventDefault();
    setErro("");
    if (!name.trim()) { setErro("Dê um nome para a aplicação."); return; }
    const fields = {
      name: name.trim(), kind, institution: institution.trim() || null, reserva,
      vencimento: vencimento || null,
    };
    if (taxa.trim()) {
      const t = parseBRNumber(taxa);
      if (!Number.isFinite(t) || t < -100 || t > 1000) { setErro("A taxa anual precisa ser um número, por exemplo 11,5."); return; }
      fields.taxa_anual = t;
    } else {
      fields.taxa_anual = null;
    }
    if (!editando) {
      const vAtual = parseBRNumber(atual);
      const vAplicado = aplicado.trim() ? parseBRNumber(aplicado) : vAtual;
      if (!Number.isFinite(vAtual) || vAtual < 0) { setErro("Informe quanto vale hoje, por exemplo 1.500,00."); return; }
      if (!Number.isFinite(vAplicado) || vAplicado < 0) { setErro("O valor aplicado precisa ser um número."); return; }
      fields.valor_atual = vAtual;
      fields.valor_aplicado = vAplicado;
    }
    onSave(fields);
  }

  const campo = "w-full text-sm px-3 py-2 rounded-lg border";
  const estilo = { borderColor: "var(--border)" };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(20,32,46,0.5)" }}>
      <form onSubmit={submit} className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-xl p-5 space-y-3 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <p className="font-serif text-lg">{editando ? "Editar aplicação" : "Nova aplicação"}</p>
          <button type="button" onClick={onClose} className="text-slate-400"><X size={16} /></button>
        </div>
        <label className="block">
          <span className="block text-xs mb-1" style={{ color: "var(--ink-soft)" }}>Nome</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Tesouro Selic 2029" className={campo} style={estilo} />
        </label>
        <label className="block">
          <span className="block text-xs mb-1" style={{ color: "var(--ink-soft)" }}>Tipo</span>
          <select value={kind} onChange={(e) => setKind(e.target.value)} className={campo} style={estilo}>
            {INVESTMENT_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs mb-1" style={{ color: "var(--ink-soft)" }}>Onde está (corretora ou banco)</span>
          <input value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="ex: BTG Pactual" className={campo} style={estilo} />
        </label>
        {!editando && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs mb-1" style={{ color: "var(--ink-soft)" }}>Vale hoje (R$)</span>
              <input inputMode="decimal" value={atual} onChange={(e) => setAtual(e.target.value)} placeholder="0,00" className={campo} style={estilo} />
            </label>
            <label className="block">
              <span className="block text-xs mb-1" style={{ color: "var(--ink-soft)" }}>Quanto você pôs (R$)</span>
              <input inputMode="decimal" value={aplicado} onChange={(e) => setAplicado(e.target.value)} placeholder="igual ao de hoje" className={campo} style={estilo} />
            </label>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs mb-1" style={{ color: "var(--ink-soft)" }}>Rentabilidade esperada (% ao ano)</span>
            <input inputMode="decimal" value={taxa} onChange={(e) => setTaxa(e.target.value)} placeholder="opcional" className={campo} style={estilo} />
          </label>
          <label className="block">
            <span className="block text-xs mb-1" style={{ color: "var(--ink-soft)" }}>Vencimento</span>
            <input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} className={campo} style={estilo} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={reserva} onChange={(e) => setReserva(e.target.checked)} />
          Conta como reserva de emergência
        </label>
        {erro && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "#fdf1ef", color: "var(--rose)" }}>{erro}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="text-sm px-3.5 py-2 rounded-lg border" style={estilo}>Cancelar</button>
          <button type="submit" disabled={busy} className="text-sm px-3.5 py-2 rounded-lg text-white disabled:opacity-60" style={{ background: "var(--ink)" }}>
            {editando ? "Salvar" : "Adicionar"}
          </button>
        </div>
      </form>
    </div>
  );
}
