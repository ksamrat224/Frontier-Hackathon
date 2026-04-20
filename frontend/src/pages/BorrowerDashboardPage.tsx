import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { fetchJson } from "../services/api";
import type {
  ActivityEventInput,
  Fraud,
  Loan,
  LoanDetailResponse,
} from "../types/app";
import { lamportsToSol, shortAddress } from "../utils/format";
import { assessFraud } from "../utils/fraud";
import { StatusBadge } from "../components/common/StatusBadge";
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
} from "../components/common/StateBlocks";

export function BorrowerDashboardPage({
  connectedWallet,
  onEvent,
}: {
  connectedWallet: string | null;
  onEvent: (item: ActivityEventInput) => void;
}) {
  const [address, setAddress] = useState("");
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repayForm, setRepayForm] = useState({
    borrowerAddress: "",
    loanId: "",
    amountNPR: "",
    esewaRef: "",
  });
  const [repayResult, setRepayResult] = useState<string | null>(null);
  const [lookupForm, setLookupForm] = useState({
    borrowerAddress: "",
    loanId: "",
  });
  const [lookupLoan, setLookupLoan] = useState<LoanDetailResponse | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!address.trim()) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchJson<{ loans: Loan[] }>(
        `/loan/borrower/${address.trim()}`,
      );
      setLoans(data.loans);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch borrower loans",
      );
      setLoans([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!connectedWallet) return;
    setAddress((current) => current || connectedWallet);
    setRepayForm((current) => ({
      ...current,
      borrowerAddress: current.borrowerAddress || connectedWallet,
    }));
    setLookupForm((current) => ({
      ...current,
      borrowerAddress: current.borrowerAddress || connectedWallet,
    }));
  }, [connectedWallet]);

  async function submitLookup(event: FormEvent) {
    event.preventDefault();
    setLookupError(null);
    setLookupLoan(null);

    if (!lookupForm.borrowerAddress.trim() || !lookupForm.loanId) {
      setLookupError("Borrower address and loan id are required for lookup.");
      return;
    }

    try {
      setLookupLoading(true);
      const payload = await fetchJson<LoanDetailResponse>(
        `/loan/${lookupForm.borrowerAddress.trim()}/${lookupForm.loanId}`,
      );
      setLookupLoan(payload);
      const fraud = assessFraud(payload.loan);
      onEvent({
        title: `Lookup loan #${payload.loan.loanId}`,
        details: `Status ${payload.loan.status} | Fraud ${fraud.severity}`,
        tone: fraud.decision === "allow" ? "success" : "warning",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lookup failed";
      setLookupError(message);
      onEvent({
        title: "Loan lookup failed",
        details: message,
        tone: "danger",
      });
    } finally {
      setLookupLoading(false);
    }
  }

  async function submitRepayment(event: FormEvent) {
    event.preventDefault();
    setRepayResult(null);

    if (
      !repayForm.borrowerAddress.trim() ||
      !repayForm.loanId ||
      !repayForm.amountNPR
    ) {
      setRepayResult("Borrower address, loan id, and amount are required.");
      return;
    }

    try {
      const data = await fetchJson<{
        onChainTx: string;
        fraud: Fraud;
        message: string;
      }>("/repayment/record", {
        method: "POST",
        body: JSON.stringify({
          borrowerAddress: repayForm.borrowerAddress.trim(),
          loanId: Number(repayForm.loanId),
          amountNPR: Number(repayForm.amountNPR),
          esewaRef: repayForm.esewaRef.trim(),
        }),
      });

      setRepayResult(`${data.message} | Tx: ${data.onChainTx}`);
      onEvent({
        title: `Repayment recorded for loan #${repayForm.loanId}`,
        details: `Tx ${data.onChainTx} | Fraud ${data.fraud.severity}`,
        tone: data.fraud.decision === "allow" ? "success" : "warning",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Repayment failed";
      setRepayResult(message);
      onEvent({
        title: "Repayment rejected",
        details: message,
        tone: "danger",
      });
    }
  }

  return (
    <section className="panel">
      <h2>Borrower Dashboard</h2>
      <form className="form-row" onSubmit={onSubmit}>
        <label htmlFor="borrowerAddress">Borrower wallet</label>
        <input
          id="borrowerAddress"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="Enter borrower wallet address"
        />
        <div className="inline-actions">
          {connectedWallet ? (
            <button
              className="btn"
              type="button"
              onClick={() => {
                setAddress(connectedWallet);
                onEvent({
                  title: "Borrower wallet prefilled",
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
        </div>
        <button className="btn btn-primary" type="submit">
          Load Borrower Loans
        </button>
      </form>
      {loading ? <LoadingBlock label="borrower loans" /> : null}
      {error ? <ErrorBlock label={error} /> : null}
      {!loading && !error && loans.length === 0 ? (
        <EmptyBlock label="No borrower loans loaded yet." />
      ) : null}
      <div className="grid loans">
        {loans.map((loan) => (
          <article className="card" key={loan.pda}>
            <div className="card-row">
              <strong>Loan #{loan.loanId}</strong>
              <StatusBadge status={loan.status} />
            </div>
            <p>Requested: {lamportsToSol(loan.amountRequestedLamports)} SOL</p>
            <p>Funded: {lamportsToSol(loan.amountFundedLamports)} SOL</p>
            <p>Repaid: {lamportsToSol(loan.amountRepaidLamports)} SOL</p>
            <p>Total Due: {lamportsToSol(loan.totalDueLamports)} SOL</p>
          </article>
        ))}
      </div>

      <h3 className="section-title">Record Repayment</h3>
      <form className="form-grid" onSubmit={submitRepayment}>
        <label htmlFor="repayBorrower">Borrower wallet</label>
        <input
          id="repayBorrower"
          value={repayForm.borrowerAddress}
          onChange={(event) =>
            setRepayForm((current) => ({
              ...current,
              borrowerAddress: event.target.value,
            }))
          }
          placeholder="Borrower wallet"
        />
        <label htmlFor="repayLoanId">Loan ID</label>
        <input
          id="repayLoanId"
          type="number"
          value={repayForm.loanId}
          onChange={(event) =>
            setRepayForm((current) => ({
              ...current,
              loanId: event.target.value,
            }))
          }
          placeholder="Loan ID"
        />
        <label htmlFor="repayAmount">Amount (NPR)</label>
        <input
          id="repayAmount"
          type="number"
          value={repayForm.amountNPR}
          onChange={(event) =>
            setRepayForm((current) => ({
              ...current,
              amountNPR: event.target.value,
            }))
          }
          placeholder="Repayment amount in NPR"
        />
        <label htmlFor="repayRef">eSewa reference</label>
        <input
          id="repayRef"
          value={repayForm.esewaRef}
          onChange={(event) =>
            setRepayForm((current) => ({
              ...current,
              esewaRef: event.target.value,
            }))
          }
          placeholder="Optional eSewa reference"
        />
        <button className="btn btn-primary" type="submit">
          Submit Repayment
        </button>
      </form>
      {repayResult ? <p className="result">{repayResult}</p> : null}

      <h3 className="section-title">Loan Detail Lookup</h3>
      <form className="form-grid" onSubmit={submitLookup}>
        <label htmlFor="lookupBorrower">Borrower wallet</label>
        <input
          id="lookupBorrower"
          value={lookupForm.borrowerAddress}
          onChange={(event) =>
            setLookupForm((current) => ({
              ...current,
              borrowerAddress: event.target.value,
            }))
          }
          placeholder="Borrower wallet"
        />
        <label htmlFor="lookupLoanId">Loan ID</label>
        <input
          id="lookupLoanId"
          type="number"
          value={lookupForm.loanId}
          onChange={(event) =>
            setLookupForm((current) => ({
              ...current,
              loanId: event.target.value,
            }))
          }
          placeholder="Loan ID"
        />
        <div className="inline-actions">
          {connectedWallet ? (
            <button
              type="button"
              className="btn"
              onClick={() =>
                setLookupForm((current) => ({
                  ...current,
                  borrowerAddress: connectedWallet,
                }))
              }
            >
              Use Connected Wallet
            </button>
          ) : null}
          <button className="btn btn-primary" type="submit">
            Lookup Loan Detail
          </button>
        </div>
      </form>

      {lookupLoading ? <LoadingBlock label="loan detail" /> : null}
      {lookupError ? <ErrorBlock label={lookupError} /> : null}

      {lookupLoan ? (
        <article className="card lookup-card">
          <div className="card-row">
            <strong>Loan #{lookupLoan.loan.loanId}</strong>
            <StatusBadge status={lookupLoan.loan.status} />
          </div>
          <p>Borrower: {shortAddress(lookupLoan.loan.borrower)}</p>
          <p>
            Requested: {lamportsToSol(lookupLoan.loan.amountRequestedLamports)}{" "}
            SOL
          </p>
          <p>
            Total Due: {lamportsToSol(lookupLoan.loan.totalDueLamports)} SOL
          </p>
          <p>
            Review Status:{" "}
            {lookupLoan.review ? lookupLoan.review.status : "no review record"}
          </p>

          {(() => {
            const fraud = assessFraud(lookupLoan.loan);
            return (
              <div className="fraud-box">
                <div className="card-row">
                  <strong>Fraud Summary</strong>
                  <span className={`badge badge-${fraud.severity}`}>
                    {fraud.severity}
                  </span>
                </div>
                <p>
                  Score: {fraud.score} | Decision:{" "}
                  <strong>{fraud.decision}</strong>
                </p>
                <ul>
                  {fraud.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            );
          })()}
        </article>
      ) : null}
    </section>
  );
}
