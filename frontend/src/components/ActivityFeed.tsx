import type { ActivityItem } from "../types/app";
import { EmptyBlock } from "./common/StateBlocks";

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
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
