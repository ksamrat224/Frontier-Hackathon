import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { fetchJson } from "../services/api";
import type { ActivityEventInput, Position } from "../types/app";
import { lamportsToSol, shortAddress } from "../utils/format";
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
} from "../components/common/StateBlocks";

export function LenderPositionsPage({
  connectedWallet,
  onEvent,
}: {
  connectedWallet: string | null;
  onEvent: (item: ActivityEventInput) => void;
}) {
  const [address, setAddress] = useState("");
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!address.trim()) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchJson<{ positions: Position[] }>(
        `/loan/lender/${address.trim()}/positions`,
      );
      setPositions(data.positions);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch lender positions",
      );
      setPositions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!connectedWallet) return;
    setAddress((current) => current || connectedWallet);
  }, [connectedWallet]);

  const totals = useMemo(() => {
    const contributed = positions.reduce(
      (sum, item) => sum + Number(item.amountContributedLamports),
      0,
    );
    const received = positions.reduce(
      (sum, item) => sum + Number(item.amountReceivedLamports),
      0,
    );
    return {
      contributed: (contributed / 1_000_000_000).toFixed(3),
      received: (received / 1_000_000_000).toFixed(3),
    };
  }, [positions]);

  return (
    <section className="panel">
      <h2>Lender Positions</h2>
      <form className="form-row" onSubmit={onSubmit}>
        <label htmlFor="lenderAddress">Lender wallet</label>
        <input
          id="lenderAddress"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="Enter lender wallet address"
        />
        {connectedWallet ? (
          <button
            className="btn"
            type="button"
            onClick={() => {
              setAddress(connectedWallet);
              onEvent({
                title: "Lender wallet prefilled",
                details: `Using connected wallet ${shortAddress(
                  connectedWallet,
                )}`,
                tone: "neutral",
              });
            }}
          >
            Use Connected Wallet
          </button>
        ) : null}
        <button className="btn btn-primary" type="submit">
          Load Positions
        </button>
      </form>
      {positions.length > 0 ? (
        <p className="result">
          Contributed: {totals.contributed} SOL | Received: {totals.received} SOL
        </p>
      ) : null}
      {loading ? <LoadingBlock label="lender positions" /> : null}
      {error ? <ErrorBlock label={error} /> : null}
      {!loading && !error && positions.length === 0 ? (
        <EmptyBlock label="No lender positions loaded yet." />
      ) : null}
      <div className="grid positions">
        {positions.map((position) => (
          <article className="card" key={position.pda}>
            <p>Loan: {shortAddress(position.loan)}</p>
            <p>
              Contributed: {lamportsToSol(position.amountContributedLamports)} SOL
            </p>
            <p>Received: {lamportsToSol(position.amountReceivedLamports)} SOL</p>
            <p>
              Funded At: {new Date(position.fundedAtUnix * 1000).toLocaleString()}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
