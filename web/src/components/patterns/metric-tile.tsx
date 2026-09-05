type Props = {
  label: string;
  value: string | number;
  trend?: string;
  className?: string;
  valueClassName?: string;
  labelClassName?: string;
  trendClassName?: string;
};

export function MetricTile({ label, value, trend, className, valueClassName, labelClassName, trendClassName }: Props) {
  return (
    <article className={`metric-tile${className ? ` ${className}` : ""}`}>
      <span className={`metric-tile__label${labelClassName ? ` ${labelClassName}` : ""}`}>{label}</span>
      <strong className={`metric-tile__value${valueClassName ? ` ${valueClassName}` : ""}`}>{value}</strong>
      {trend ? <span className={`metric-tile__trend${trendClassName ? ` ${trendClassName}` : ""}`}>{trend}</span> : null}
    </article>
  );
}
