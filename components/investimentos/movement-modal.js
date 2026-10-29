"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { parseBRNumber, formatBRL, toISODate } from "@/lib/finance/core";

const TEXTOS = {
  aporte: { titulo: "Registrar aporte", rotulo: "Quanto você colocou (R$)", botao: "Registrar aporte", ajuda: "O valor soma ao que você aplicou e ao que vale hoje." },
  resgate: { titulo: "Registrar resgate", rotulo: "Quanto você tirou (R$)", botao: "Registrar resgate", ajuda: "O que você aplicou diminui na mesma proporção, para o resultado não mudar." },
  valor: { titulo: "Atualizar quanto vale hoje", rotulo: "Valor de hoje (R$)", botao: "Atualizar valor", ajuda: "Use quando o banco ou a corretora mostrar um saldo novo. O que você aplicou não muda." },
};

export default function MovementModal({ inv, kind, onConfirm, onClose, busy }) {
  const t = TEXTOS[kind];
  const [valor, setValor] = useState("");
  const [data, setData] = useState(toISODate(new Date()));
  const [erro, setErro] = useState("");

  function submit(e) {
    e.preventDefault();
    const v = parseBRNumber(valor);
    if (!Number.isFinite(v) || v < 0 || (kind !== "valor" && v === 0)) { setErro("Informe um valor válido, por exemplo 250,00."); return; }
    if (kind === "resgate" && v > Number(inv.valor_atual) + 0.005) { setErro(`O resgate não pode passar de ${formatBRL(Number(inv.valor_atual))}.`); return; }
    onConfirm(v, data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(20,32,46,0.5)" }}>
      <form onSubmit={submit} className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-serif text-lg">{t.titulo}</p>
          <button type="button" onClick={onClose} className="text-slate-400"><X size={16} /></button>
        </div>
        <p className="text-sm" style={{ color: "var(--ink)" }}>{inv.name}</p>
        <p className="text-xs" style={{ color: "var(--ink-soft)" }}>Hoje vale {formatBRL(Number(inv.valor_atual))}. {t.ajuda}</p>
        <label className="block">
          <span className="block text-xs mb-1" style={{ color: "var(--ink-soft)" }}>{t.rotulo}</span>
          <input autoFocus inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00"
            className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }} />
        </label>
        <label className="block">
          <span className="block text-xs mb-1" style={{ color: "var(--ink-soft)" }}>Data</span>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }} />
        </label>
        {erro && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "#fdf1ef", color: "var(--rose)" }}>{erro}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="text-sm px-3.5 py-2 rounded-lg border" style={{ borderColor: "var(--border)" }}>Cancelar</button>
          <button type="submit" disabled={busy} className="text-sm px-3.5 py-2 rounded-lg text-white disabled:opacity-60" style={{ background: "var(--ink)" }}>{t.botao}</button>
        </div>
      </form>
    </div>
  );
}
