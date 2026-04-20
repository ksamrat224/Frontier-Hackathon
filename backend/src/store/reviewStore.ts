import type { ReviewRecord } from "../types/review";

const reviewStore = new Map<string, ReviewRecord>();

function reviewKey(borrowerAddress: string, loanId: number): string {
  return `${borrowerAddress}:${loanId}`;
}

export function getReview(
  borrowerAddress: string,
  loanId: number,
): ReviewRecord | null {
  return reviewStore.get(reviewKey(borrowerAddress, loanId)) ?? null;
}

export function upsertReview(review: ReviewRecord): void {
  reviewStore.set(reviewKey(review.borrowerAddress, review.loanId), review);
}

export function listReviews(): ReviewRecord[] {
  return Array.from(reviewStore.values()).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}
