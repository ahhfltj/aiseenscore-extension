import { verdictFor } from '../../../src/audit/verdict';

export function ScoreSummary({ score }: { score: number }) {
  return (
    <section className="score" aria-label="Score">
      <p className="score-number">
        <span aria-hidden="true">{score}</span>
        <span className="sr-only">Score {score} out of 100.</span>
        <span className="score-max" aria-hidden="true"> / 100</span>
      </p>
      <p className="verdict">{verdictFor(score)}</p>
    </section>
  );
}
