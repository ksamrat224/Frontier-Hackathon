import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { fetchJson } from "../services/api";
import type { ActivityEventInput, Review } from "../types/app";
import { shortAddress } from "../utils/format";
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
} from "../components/common/StateBlocks";

export function AdminPanelPage({
  onEvent,
}: {
  onEvent: (item: ActivityEventInput) => void;
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
      const data = await fetchJson<{ reviews: Review[] }>("/loan/admin/reviews");
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
          <article className="card" key={`${review.borrowerAddress}:${review.loanId}`}>
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
