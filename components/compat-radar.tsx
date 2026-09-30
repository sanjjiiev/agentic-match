// components/compat-radar.tsx
import type { CompatibilityDimension } from "@/types";

export function CompatRadar({
  dimensions,
  size = 240,
}: {
  dimensions: CompatibilityDimension[];
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 34;
  const n = dimensions.length;

  const point = (i: number, value: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const dist = (value / 100) * r;
    return [cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist] as const;
  };

  const polygon = dimensions.map((d, i) => point(i, d.value).join(",")).join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[260px]">
      {[25, 50, 75, 100].map((ring) => (
        <polygon
          key={ring}
          points={dimensions.map((_, i) => point(i, ring).join(",")).join(" ")}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={1}
        />
      ))}
      {dimensions.map((_, i) => {
        const [x, y] = point(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth={1} />;
      })}
      <polygon points={polygon} fill="rgba(168,85,247,0.28)" stroke="#a855f7" strokeWidth={2} />
      {dimensions.map((d, i) => {
        const [x, y] = point(i, d.value);
        return <circle key={d.label} cx={x} cy={y} r={3} fill="#c084fc" />;
      })}
      {dimensions.map((d, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const lx = cx + Math.cos(angle) * (r + 20);
        const ly = cy + Math.sin(angle) * (r + 20);
        return (
          <text
            key={d.label}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-zinc-500 text-[8px] uppercase tracking-wider"
          >
            {d.label.split(" ")[0]}
          </text>
        );
      })}
    </svg>
  );
}