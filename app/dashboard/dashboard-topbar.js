"use client";

export default function DashboardTopbar({ userEmail, householdName }) {
  return (
    <header className="border-b bg-white" style={{ borderColor: "var(--border)" }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3.5">
        <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "var(--brick)" }}>{householdName}</p>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-soft)" }}>{userEmail}</p>
      </div>
    </header>
  );
}
