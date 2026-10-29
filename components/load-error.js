"use client";

// Mostrado quando a leitura dos dados falha. Evita ficar em "Carregando…" para sempre e,
// principalmente, evita tratar uma falha de rede como se a pessoa não tivesse família.
export default function LoadError({ onRetry }) {
  return (
    <div className="rounded-xl border p-5 text-sm" style={{ borderColor: "var(--border)", background: "white", color: "var(--ink)" }}>
      <p className="mb-3">Não consegui carregar seus dados agora. Nada foi alterado. Confira a conexão e tente de novo.</p>
      <button onClick={onRetry} className="text-sm px-3.5 py-2 rounded-lg text-white" style={{ background: "var(--ink)" }}>
        Tentar de novo
      </button>
    </div>
  );
}
