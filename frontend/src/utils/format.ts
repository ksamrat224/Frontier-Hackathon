export function lamportsToSol(value: string): string {
  const sol = Number(value) / 1_000_000_000;
  return Number.isFinite(sol) ? sol.toFixed(3) : "0.000";
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
