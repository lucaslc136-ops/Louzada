"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, CreditCard, PiggyBank, Gauge, AlertTriangle, RefreshCw, Scale, Repeat } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getMyHouseholdId, listAccounts } from "@/lib/data/accounts";
import { listAllTransactions } from "@/lib/data/transactions";
import { listDebts } from "@/lib/data/debts";
import { getSettings } from "@/lib/data/settings";
import { computeAlerts, toISODate } from "@/lib/finance/core";

const ICON_BY_TYPE = { fatura: CreditCard, orcamento: Gauge, divida: PiggyBank, revisao: RefreshCw, reconciliacao: Scale, assinatura: Repeat };
const SEEN_KEY_PREFIX = "louzada_alerts_seen_";

// Guarda, no navegador, quais alertas (pela assinatura) a pessoa já abriu o sino e viu. Cada
// alerta muda de assinatura quando o que ele representa muda de verdade (ex: um lançamento a
// mais precisando de revisão) — então "já visto" não esconde coisa nova.
function loadSeen(householdId) {
  if (typeof window === "undefined" || !householdId) return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY_PREFIX + householdId) || "[]"));
  } catch {
    return new Set();
  }
}

function saveSeen(householdId, signatures) {
  if (typeof window === "undefined" || !householdId) return;
  localStorage.setItem(SEEN_KEY_PREFIX + householdId, JSON.stringify([...signatures]));
}

export default function AlertsBell() {
  const supabase = createClient();
  const [alerts, setAlerts] = useState([]);
  const [householdId, setHouseholdId] = useState(null);
  const [seenSignatures, setSeenSignatures] = useState(new Set());
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    (async () => {
      const hid = await getMyHouseholdId(supabase);
      if (!hid) return;
      setHouseholdId(hid);
      setSeenSignatures(loadSeen(hid));
      const [accounts, transactions, debts, settings] = await Promise.all([
        listAccounts(supabase, hid),
        listAllTransactions(supabase, hid),
        listDebts(supabase, hid),
        getSettings(supabase, hid),
      ]);
      setAlerts(computeAlerts({ accounts, transactions, debts, settings, todayISO: toISODate(new Date()) }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const naoVistos = alerts.filter((a) => !seenSignatures.has(a.signature));
  const temAlertaAltoNaoVisto = naoVistos.some((a) => a.severidade === "alta");

  function handleToggleOpen() {
    setOpen((v) => {
      const abrindo = !v;
      if (abrindo && alerts.length > 0 && householdId) {
        const novoSet = new Set(seenSignatures);
        alerts.forEach((a) => novoSet.add(a.signature));
        setSeenSignatures(novoSet);
        saveSeen(householdId, novoSet);
      }
      return abrindo;
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleToggleOpen}
        className="relative w-9 h-9 rounded-lg flex items-center justify-center"
        style={{ color: "var(--ink-soft)" }}
        title="Alertas"
      >
        <Bell size={17} />
        {naoVistos.length > 0 && (
          <span
            className="absolute top-1 right-1 min-w-[15px] h-[15px] px-0.5 rounded-full text-[9px] text-white flex items-center justify-center font-medium"
            style={{ background: temAlertaAltoNaoVisto ? "var(--rose)" : "var(--amber)" }}
          >
            {naoVistos.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-white rounded-xl border shadow-lg z-30 overflow-hidden" style={{ borderColor: "var(--border)" }}>
          <div className="px-3.5 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs font-medium" style={{ color: "var(--ink)" }}>Alertas</p>
          </div>
          {alerts.length === 0 ? (
            <p className="text-xs px-3.5 py-4 text-center" style={{ color: "var(--ink-soft)" }}>Nenhum alerta no momento.</p>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              {alerts.map((a) => {
                const Icon = ICON_BY_TYPE[a.tipo] || AlertTriangle;
                return (
                  <Link
                    key={a.id} href={a.href} onClick={() => setOpen(false)}
                    className="flex items-start gap-2.5 px-3.5 py-2.5 text-xs hover:bg-slate-50 border-b last:border-b-0"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <Icon size={14} className="shrink-0 mt-0.5" style={{ color: a.severidade === "alta" ? "var(--rose)" : "var(--amber)" }} />
                    <span style={{ color: "var(--ink)" }}>{a.titulo}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
