import { useEffect, useState } from "react";
import { fetchJson } from "../services/api";
import type { ActivityEventInput, Fraud, Loan } from "../types/app";
import { lamportsToSol, shortAddress } from "../utils/format";
import { StatusBadge } from "../components/common/StatusBadge";
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
} from "../components/common/StateBlocks";

export function MarketplacePage({
  onEvent,
}: {
  onEvent: (item: ActivityEventInput) => void;
}) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchJson<{ loans: Loan[] }>("/loan/open");
      setLoans(data.loans);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load open loans",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function disburse(loan: Loan) {
    setResult(null);
    try {
      const data = await fetchJson<{ onChainTx: string; fraud: Fraud }>(
        "/loan/disburse",
        {
          method: "POST",
          body: JSON.stringify({
            borrowerAddress: loan.borrower,
            loanId: Number(loan.loanId),
          }),
        },
      );
      setResult(`Disbursed loan ${loan.loanId}. Tx: ${data.onChainTx}`);
      onEvent({
        title: `Disbursed loan #${loan.loanId}`,
        details: `Tx ${data.onChainTx} | Fraud ${data.fraud.severity}`,
        tone: data.fraud.decision === "allow" ? "success" : "warning",
      });
      await load();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Disbursement failed";
      setResult(message);
      onEvent({
        title: "Disbursement failed",
        details: message,
        tone: "danger",
      });
    }
  }

  if (loading) return <LoadingBlock label="open marketplace loans" />;
  if (error) return <ErrorBlock label={error} />;
  if (loans.length === 0)
    return <EmptyBlock label="No open loans right now." />;

  return (
    <section className="panel">
      <header className="panel-head">
        <h2>Marketplace</h2>
        <button className="btn" onClick={() => void load()}>
          Refresh
        </button>
      </header>
      {result ? <p className="result">{result}</p> : null}
      <div className="grid loans">
        {loans.map((loan) => (
          <article className="card" key={loan.pda}>
            <div className="card-row">
              <strong>Loan #{loan.loanId}</strong>
              <StatusBadge status={loan.status} />
            </div>
            <p>Borrower: {shortAddress(loan.borrower)}</p>
            <p>Requested: {lamportsToSol(loan.amountRequestedLamports)} SOL</p>
            <p>Interest: {(loan.interestBps / 100).toFixed(2)}%</p>
            <p>Credit: {loan.creditScoreSnapshot}</p>
            <button
              className="btn btn-primary"
              onClick={() => void disburse(loan)}
            >
              Trigger Disbursement
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
