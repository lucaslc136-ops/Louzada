// Marca "Louzada": um selo com três barras ascendentes (referência a crescimento financeiro)
// e, no lockup completo, o nome em serifa com uma "régua de progresso" por baixo.
// Coordenadas medidas e ajustadas visualmente antes de entrar aqui — ver conversa de design.

export function LogoIcon({ size = 44, inverted = false, className = "" }) {
  const bg = inverted ? "#f3f5f7" : "#14202e";
  const bar = inverted ? "#14202e" : "#f3f5f7";
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" role="img" aria-label="Louzada" className={className}>
      <rect width="44" height="44" rx="10" fill={bg} />
      <rect x="12" y="11" width="7" height="24" fill={bar} />
      <rect x="22" y="23" width="7" height="12" fill={bar} />
      <rect x="32" y="17" width="7" height="18" fill={bar} />
    </svg>
  );
}

export function LogoLockup({ height = 44, inverted = false, className = "" }) {
  const width = Math.round((220 / 64) * height);
  const bg = inverted ? "#f3f5f7" : "#14202e";
  const bar = inverted ? "#14202e" : "#f3f5f7";
  const text = inverted ? "#f3f5f7" : "#14202e";
  const accent = inverted ? "#d97b5e" : "#a8432a";
  return (
    <svg width={width} height={height} viewBox="0 0 220 64" role="img" aria-label="Louzada" className={className}>
      <rect x="4" y="6" width="44" height="44" rx="10" fill={bg} />
      <rect x="16" y="17" width="7" height="24" fill={bar} />
      <rect x="26" y="29" width="7" height="12" fill={bar} />
      <rect x="36" y="23" width="7" height="18" fill={bar} />
      <text x="60" y="34" fontFamily="Georgia, serif" fontSize="22" fontWeight="bold" fill={text}>Louzada</text>
      <rect x="60" y="42" width="84" height="3" fill={text} />
      <rect x="60" y="42" width="27" height="3" fill={accent} />
    </svg>
  );
}
