import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: () => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
    };
  }
}

type LoanStatus =
  | "open"
  | "funded"
  | "active"
  | "repaid"
  | "defaulted"
  | "cancelled"
  | "unknown";

interface Loan {
  pda: string;
  borrower: string;
  loanId: string;
  amountRequestedLamports: string;
  amountFundedLamports: string;
  amountRepaidLamports: string;
  totalDueLamports: string;
  interestBps: number;
  durationDays: number;
  creditScoreSnapshot: number;
  status: LoanStatus;
}

interface Position {
  pda: string;
  lender: string;
  loan: string;
  amountContributedLamports: string;
  amountReceivedLamports: string;
  fundedAtUnix: number;
}

interface Review {
  borrowerAddress: string;
  loanId: number;
  status: "pending" | "approved" | "rejected";
  notes?: string;
  updatedAt: string;
}

interface Fraud {
  score: number;
  severity: "low" | "medium" | "high" | "critical";
  decision: "allow" | "review" | "block";
  reasons: string[];
}

interface ActivityItem {
  id: string;
  title: string;
  details: string;
  createdAt: string;
  tone: "neutral" | "success" | "warning" | "danger";
}

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001/api";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Request failed" }));
    throw new Error(error.error ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

function lamportsToSol(value: string): string {
  const sol = Number(value) / 1_000_000_000;
  return Number.isFinite(sol) ? sol.toFixed(3) : "0.000";
}

function shortAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function StatusBadge({ status }: { status: LoanStatus }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

function LoadingBlock({ label }: { label: string }) {
  return <div className="state loading">Loading {label}...</div>;
}

function ErrorBlock({ label }: { label: string }) {
  return <div className="state error">{label}</div>;
}

function EmptyBlock({ label }: { label: string }) {
  return <div className="state empty">{label}</div>;
}

function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <aside className="panel feed-panel">
      <h2>Transaction Feed</h2>
      {items.length === 0 ? (
        <EmptyBlock label="No actions yet. Start with marketplace or repayment." />
      ) : null}
      <ul className="feed-list" aria-live="polite">
        {items.map((item) => (
          <li key={item.id} className={`feed-item tone-${item.tone}`}>
            <strong>{item.title}</strong>
            <p>{item.details}</p>
            <small>{new Date(item.createdAt).toLocaleString()}</small>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function MarketplacePage({
  onEvent,
}: {
  onEvent: (item: Omit<ActivityItem, "id" | "createdAt">) => void;
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

function BorrowerDashboardPage({
  connectedWallet,
  onEvent,
}: {
  connectedWallet: string | null;
  onEvent: (item: Omit<ActivityItem, "id" | "createdAt">) => void;
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
  }, [connectedWallet]);

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
    </section>
  );
}

function LenderPositionsPage({
  connectedWallet,
  onEvent,
}: {
  connectedWallet: string | null;
  onEvent: (item: Omit<ActivityItem, "id" | "createdAt">) => void;
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
          Contributed: {totals.contributed} SOL | Received: {totals.received}{" "}
          SOL
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
              Contributed: {lamportsToSol(position.amountContributedLamports)}{" "}
              SOL
            </p>
            <p>
              Received: {lamportsToSol(position.amountReceivedLamports)} SOL
            </p>
            <p>
              Funded At:{" "}
              {new Date(position.fundedAtUnix * 1000).toLocaleString()}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function AdminPanelPage({
  onEvent,
}: {
  onEvent: (item: Omit<ActivityItem, "id" | "createdAt">) => void;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    borrowerAddress: "",
    loanId: "",
    status: "pending",
    notes: "",
  });

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchJson<{ reviews: Review[] }>(
        "/loan/admin/reviews",
      );
      setReviews(data.reviews);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load admin reviews",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function submitReview(event: FormEvent) {
    event.preventDefault();
    setStatusMessage(null);
    try {
      await fetchJson<{ success: boolean; message: string }>(
        "/loan/admin/review",
        {
          method: "POST",
          body: JSON.stringify({
            borrowerAddress: form.borrowerAddress.trim(),
            loanId: Number(form.loanId),
            status: form.status,
            notes: form.notes,
          }),
        },
      );
      setStatusMessage("Review updated.");
      onEvent({
        title: `Review ${form.status} for loan #${form.loanId}`,
        details: form.notes || "No notes provided",
        tone:
          form.status === "approved"
            ? "success"
            : form.status === "rejected"
            ? "danger"
            : "warning",
      });
      await load();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update review";
      setStatusMessage(message);
      onEvent({
        title: "Review update failed",
        details: message,
        tone: "danger",
      });
    }
  }

  return (
    <section className="panel">
      <h2>Admin Fraud and Review Panel</h2>
      <form className="form-grid" onSubmit={submitReview}>
        <label htmlFor="reviewBorrower">Borrower</label>
        <input
          id="reviewBorrower"
          value={form.borrowerAddress}
          onChange={(event) =>
            setForm({ ...form, borrowerAddress: event.target.value })
          }
          placeholder="Borrower wallet"
        />
        <label htmlFor="reviewLoanId">Loan ID</label>
        <input
          id="reviewLoanId"
          value={form.loanId}
          onChange={(event) => setForm({ ...form, loanId: event.target.value })}
          placeholder="Loan ID"
          type="number"
        />
        <label htmlFor="reviewStatus">Status</label>
        <select
          id="reviewStatus"
          value={form.status}
          onChange={(event) => setForm({ ...form, status: event.target.value })}
        >
          <option value="pending">pending</option>
          <option value="approved">approved</option>
          <option value="rejected">rejected</option>
        </select>
        <label htmlFor="reviewNotes">Notes</label>
        <textarea
          id="reviewNotes"
          value={form.notes}
          onChange={(event) => setForm({ ...form, notes: event.target.value })}
          placeholder="Why this decision was made"
        />
        <button className="btn btn-primary" type="submit">
          Update Review
        </button>
      </form>
      {statusMessage ? <p className="result">{statusMessage}</p> : null}
      {loading ? <LoadingBlock label="admin reviews" /> : null}
      {error ? <ErrorBlock label={error} /> : null}
      {!loading && !error && reviews.length === 0 ? (
        <EmptyBlock label="No reviews yet." />
      ) : null}
      <div className="grid reviews">
        {reviews.map((review) => (
          <article
            className="card"
            key={`${review.borrowerAddress}:${review.loanId}`}
          >
            <div className="card-row">
              <strong>Loan #{review.loanId}</strong>
              <span className={`badge badge-${review.status}`}>
                {review.status}
              </span>
            </div>
            <p>Borrower: {shortAddress(review.borrowerAddress)}</p>
            <p>Updated: {new Date(review.updatedAt).toLocaleString()}</p>
            <p>Notes: {review.notes || "No notes"}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function App() {
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  function addActivity(item: Omit<ActivityItem, "id" | "createdAt">) {
    setActivity((current) =>
      [
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          createdAt: new Date().toISOString(),
          ...item,
        },
        ...current,
      ].slice(0, 20),
    );
  }

  async function connectWallet() {
    setWalletError(null);
    try {
      if (!window.solana?.isPhantom) {
        throw new Error(
          "Phantom wallet not found. Install Phantom extension to connect.",
        );
      }

      const response = await window.solana.connect();
      const wallet = response.publicKey.toString();
      setConnectedWallet(wallet);
      addActivity({
        title: "Wallet connected",
        details: `Connected ${shortAddress(wallet)}`,
        tone: "success",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to connect wallet";
      setWalletError(message);
      addActivity({
        title: "Wallet connection failed",
        details: message,
        tone: "danger",
      });
    }
  }

  async function disconnectWallet() {
    try {
      await window.solana?.disconnect();
    } catch {
      // Ignore disconnect failures from browser wallet providers.
    }
    setConnectedWallet(null);
    addActivity({
      title: "Wallet disconnected",
      details: "Manual disconnect triggered",
      tone: "neutral",
    });
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>SaathiLoan MVP Console</h1>
          <p>Chain-powered lending views for hackathon demo mode</p>
        </div>
        <nav className="nav">
          <NavLink to="/marketplace">Marketplace</NavLink>
          <NavLink to="/borrower">Borrower Dashboard</NavLink>
          <NavLink to="/lender">Lender Positions</NavLink>
          <NavLink to="/admin">Admin Panel</NavLink>
        </nav>
        <div className="wallet-row">
          <p className="wallet-status">
            {connectedWallet
              ? `Connected wallet: ${shortAddress(connectedWallet)}`
              : "Wallet not connected"}
          </p>
          <div className="inline-actions">
            {!connectedWallet ? (
              <button
                className="btn btn-primary"
                onClick={() => void connectWallet()}
              >
                Connect Phantom
              </button>
            ) : (
              <button className="btn" onClick={() => void disconnectWallet()}>
                Disconnect Wallet
              </button>
            )}
          </div>
          {walletError ? <p className="state error">{walletError}</p> : null}
        </div>
      </header>
      <main className="dashboard-grid">
        <Routes>
          <Route path="/" element={<Navigate replace to="/marketplace" />} />
          <Route
            path="/marketplace"
            element={<MarketplacePage onEvent={addActivity} />}
          />
          <Route
            path="/borrower"
            element={
              <BorrowerDashboardPage
                connectedWallet={connectedWallet}
                onEvent={addActivity}
              />
            }
          />
          <Route
            path="/lender"
            element={
              <LenderPositionsPage
                connectedWallet={connectedWallet}
                onEvent={addActivity}
              />
            }
          />
          <Route
            path="/admin"
            element={<AdminPanelPage onEvent={addActivity} />}
          />
        </Routes>
        <ActivityFeed items={activity} />
      </main>
    </div>
  );
}

export default App;
