interface ProgressBarProps {
  label: string;
  value: number;
}

export function ProgressBar({ label, value }: ProgressBarProps) {
  const boundedValue = Math.min(100, Math.max(0, value));

  return (
    <div className="progress-line">
      <span>{label}</span>
      <span
        className="track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={boundedValue}
      >
        <span style={{ width: `${boundedValue}%` }} />
      </span>
      <span>{boundedValue}%</span>
    </div>
  );
}
