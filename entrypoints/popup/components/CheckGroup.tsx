import type { CheckResult } from '../../../src/audit/types';
import { CheckRow } from './CheckRow';

export function CheckGroup({ title, checks }: { title: string; checks: CheckResult[] }) {
  if (!checks.length) return null;
  return (
    <section className="group" aria-label={title}>
      <h2>
        {title} <span className="count">{checks.length}</span>
      </h2>
      <ul className="rows">
        {checks.map((c) => (
          <CheckRow key={c.id} check={c} />
        ))}
      </ul>
    </section>
  );
}
