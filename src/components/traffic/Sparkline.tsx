interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  fillColor?: string;
}

export function Sparkline({ values, width = 80, height = 24, color = 'currentColor', fillColor }: SparklineProps) {
  if (values.length === 0) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;

  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });

  const path = `M ${points.join(' L ')}`;
  const area = `${path} L ${width},${height} L 0,${height} Z`;

  return (
    <svg width={width} height={height} className="inline-block overflow-visible" aria-hidden>
      {fillColor && <path d={area} fill={fillColor} opacity={0.2} />}
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      {values.length > 0 && (
        <circle
          cx={(values.length - 1) * stepX}
          cy={height - ((values[values.length - 1] - min) / range) * height}
          r={1.8}
          fill={color}
        />
      )}
    </svg>
  );
}
