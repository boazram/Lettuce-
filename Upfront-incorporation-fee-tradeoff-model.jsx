import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area } from "recharts";

const C = {
  bg: '#0B0F1A', surface: '#131825', surface2: '#1A2035', border: '#1E2A42',
  text: '#E2E8F0', textMuted: '#8494B2', textDim: '#5A6A88',
  green: '#34D399', red: '#F87171', blue: '#60A5FA', yellow: '#FBBF24',
};

const BASELINE_SIGNUPS = 100;
const BASELINE_CONV = 0.50;
const FEE = 200;
const AVG_LTV = 1200;

export default function App() {
  const [signupDrop, setSignupDrop] = useState(30);
  const [convRate, setConvRate] = useState(70);

  const baseline = useMemo(() => ({
    paying: BASELINE_SIGNUPS * BASELINE_CONV,
    totalRevenue: BASELINE_SIGNUPS * BASELINE_CONV * AVG_LTV,
  }), []);

  const experiment = useMemo(() => {
    const signups = BASELINE_SIGNUPS * (1 - signupDrop / 100);
    const paying = signups * (convRate / 100);
    const feeRevenue = signups * FEE;
    const netFeeRevenue = feeRevenue - paying * FEE;
    const totalRevenue = paying * AVG_LTV + netFeeRevenue;
    return { signups, paying, netFeeRevenue, totalRevenue };
  }, [signupDrop, convRate]);

  const payingDelta = experiment.paying - baseline.paying;
  const breakEvenConv = (BASELINE_CONV / (1 - signupDrop / 100)) * 100;
  const isWin = payingDelta >= 0;

  const breakEvenCurve = useMemo(() => Array.from({ length: 71 }, (_, i) => {
    const drop = i;
    const remaining = 1 - drop / 100;
    const needed = remaining > 0 ? parseFloat((BASELINE_CONV / remaining * 100).toFixed(1)) : null;
    return { drop, neededConv: needed && needed <= 100 ? needed : null };
  }), []);

  const convSweep = useMemo(() => Array.from({ length: 51 }, (_, i) => {
    const conv = 40 + i;
    const signups = BASELINE_SIGNUPS * (1 - signupDrop / 100);
    const paying = parseFloat((signups * (conv / 100)).toFixed(1));
    return { conv, paying, baseline: baseline.paying };
  }), [signupDrop, baseline]);

  const drops = [10, 20, 30, 40, 50];
  const convRates = [55, 60, 65, 70, 75, 80, 85, 90, 95];

  const gap = convRate - breakEvenConv;
  const isImpossible = breakEvenConv > 100;
  let verdictTitle, verdictMsg, verdictColor, verdictBg;
  if (isImpossible) {
    verdictTitle = "Break-even is unreachable";
    verdictMsg = `A ${signupDrop}% signup drop requires >100% conversion — mathematically impossible. Fee is filtering too aggressively.`;
    verdictColor = C.red; verdictBg = '#7F1D1D20';
  } else if (isWin && gap >= 10) {
    verdictTitle = "Strong win scenario";
    verdictMsg = `Need ${breakEvenConv.toFixed(1)}% to break even, projecting ${convRate}% — ${gap.toFixed(1)}pp cushion. Fee revenue adds $${experiment.netFeeRevenue.toFixed(0)} on top.`;
    verdictColor = C.green; verdictBg = '#065F4620';
  } else if (isWin) {
    verdictTitle = "Marginal win — thin cushion";
    verdictMsg = `Need ${breakEvenConv.toFixed(1)}% to break even, projecting ${convRate}%. Only ${gap.toFixed(1)}pp margin — small errors could flip this.`;
    verdictColor = C.yellow; verdictBg = '#78350F20';
  } else {
    verdictTitle = "Loss scenario";
    verdictMsg = `At ${convRate}% conversion with ${signupDrop}% signup drop, you produce fewer paying customers. Need ${breakEvenConv.toFixed(1)}% to break even — ${Math.abs(gap).toFixed(1)}pp short. Fee revenue ($${experiment.netFeeRevenue.toFixed(0)}) partially offsets.`;
    verdictColor = C.red; verdictBg = '#7F1D1D20';
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif", padding: '28px 32px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>Incorporation Fee Experiment</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px', letterSpacing: -0.5 }}>Signup Drop vs. Conversion Lift — Tradeoff Model</h1>
          <p style={{ color: C.textMuted, fontSize: 13, margin: 0 }}>How much does conversion need to improve to offset the signup drop? Adjust sliders to explore scenarios.</p>
        </div>

        {/* Assumption banner */}
        <div style={{
          background: '#1E3A5F30',
          border: `1px solid ${C.blue}40`,
          borderLeft: `3px solid ${C.blue}`,
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.blue, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>100 users</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.blue, marginBottom: 2 }}>Normalized to 100 users entering the funnel</div>
            <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.5 }}>
              All outputs are rates, not absolute counts. "50 paying" = 50% of funnel converts. To get real numbers, multiply by your actual monthly signup volume.
            </div>
          </div>
        </div>

        {/* Sliders */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
          {[
            { label: 'Signup Drop', value: signupDrop, onChange: setSignupDrop, min: 0, max: 70, color: C.red, sub: `${(BASELINE_SIGNUPS*(1-signupDrop/100)).toFixed(0)} of 100 funnel entrants proceed to incorporate` },
            { label: 'Experiment Conversion Rate', value: convRate, onChange: setConvRate, min: 40, max: 100, color: C.green, sub: `Baseline 50% · ${convRate > 50 ? `+${convRate-50}pp lift` : `${convRate-50}pp`}` },
          ].map(s => (
            <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,transparent,${s.color},transparent)`, opacity: 0.7 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 }}>{s.label}</div>
                <div style={{ fontSize: 30, fontWeight: 800, color: s.color }}>{s.value}%</div>
              </div>
              <input type="range" min={s.min} max={s.max} value={s.value} onChange={e => s.onChange(Number(e.target.value))}
                style={{ width: '100%', accentColor: s.color, cursor: 'pointer' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.textDim, marginTop: 4 }}>
                <span>{s.min}%</span><span style={{ color: C.textMuted, fontSize: 11 }}>{s.sub}</span><span>{s.max}%</span>
              </div>
            </div>
          ))}
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Baseline Paying', value: baseline.paying.toFixed(0), sub: 'per 100 signups', color: C.textMuted },
            { label: 'Experiment Paying', value: experiment.paying.toFixed(1), sub: 'per 100 signups', color: isWin ? C.green : C.red },
            { label: 'Net Paying Δ', value: `${payingDelta >= 0 ? '+' : ''}${payingDelta.toFixed(1)}`, sub: isWin ? 'Experiment wins' : 'Experiment loses', color: isWin ? C.green : C.red },
            { label: 'Net Fee Revenue', value: `$${experiment.netFeeRevenue.toFixed(0)}`, sub: 'non-converting users', color: C.yellow },
          ].map(k => (
            <div key={k.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: C.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: k.color, lineHeight: 1.1 }}>{k.value}</div>
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 3 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Verdict */}
        <div style={{ background: verdictBg, border: `1px solid ${verdictColor}30`, borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 20 }}>
          <span style={{ color: verdictColor, fontSize: 14, marginTop: 1 }}>◆</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: verdictColor, marginBottom: 2 }}>{verdictTitle}</div>
            <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.6 }}>{verdictMsg}</div>
          </div>
        </div>

        {/* Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 2 }}>Break-Even Conversion Required</div>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 14 }}>Min conversion to match baseline paying customers</div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={breakEvenCurve} margin={{ left: -10, right: 8, bottom: 16 }}>
                <defs>
                  <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.red} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={C.red} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="drop" tick={{ fill: C.textMuted, fontSize: 10 }} tickFormatter={v => `${v}%`} label={{ value: 'Signup Drop', position: 'insideBottom', offset: -8, fill: C.textDim, fontSize: 10 }} />
                <YAxis tick={{ fill: C.textMuted, fontSize: 10 }} tickFormatter={v => `${v}%`} domain={[48, 102]} />
                <Tooltip content={({ active, payload }) => active && payload?.[0] ? (
                  <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                    <div style={{ color: C.textMuted }}>Signup drop: {payload[0].payload.drop}%</div>
                    <div style={{ color: C.red, fontWeight: 700 }}>Need: {payload[0].value}% conversion</div>
                  </div>
                ) : null} />
                <Area type="monotone" dataKey="neededConv" stroke={C.red} fill="url(#rg)" strokeWidth={2} dot={false} connectNulls />
                <ReferenceLine x={signupDrop} stroke={C.blue} strokeDasharray="4 4" strokeWidth={1.5} />
                <ReferenceLine y={Math.min(convRate, 100)} stroke={C.green} strokeDasharray="4 4" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 14, fontSize: 10, color: C.textDim, marginTop: 6 }}>
              <span><span style={{ color: C.red }}>—</span> Break-even line</span>
              <span><span style={{ color: C.blue }}>- -</span> Your drop ({signupDrop}%)</span>
              <span><span style={{ color: C.green }}>- -</span> Your conv ({convRate}%)</span>
            </div>
          </div>

          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 2 }}>Paying Customers vs. Conversion Rate</div>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 14 }}>At {signupDrop}% signup drop · baseline = {baseline.paying} paying</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={convSweep} margin={{ left: -10, right: 8, bottom: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="conv" tick={{ fill: C.textMuted, fontSize: 10 }} tickFormatter={v => `${v}%`} label={{ value: 'Conversion Rate', position: 'insideBottom', offset: -8, fill: C.textDim, fontSize: 10 }} />
                <YAxis tick={{ fill: C.textMuted, fontSize: 10 }} />
                <Tooltip content={({ active, payload }) => active && payload?.length ? (
                  <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                    <div style={{ color: C.textMuted }}>Conv: {payload[0]?.payload.conv}%</div>
                    <div style={{ color: C.green, fontWeight: 700 }}>Experiment: {payload[0]?.value} paying</div>
                    <div style={{ color: C.textMuted }}>Baseline: {baseline.paying}</div>
                  </div>
                ) : null} />
                <ReferenceLine y={baseline.paying} stroke={C.textMuted} strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Baseline', fill: C.textMuted, fontSize: 10, position: 'insideTopRight' }} />
                <ReferenceLine x={convRate} stroke={C.blue} strokeDasharray="4 4" strokeWidth={1.5} />
                <Line type="monotone" dataKey="paying" stroke={C.green} strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 14, fontSize: 10, color: C.textDim, marginTop: 6 }}>
              <span><span style={{ color: C.green }}>—</span> Experiment paying</span>
              <span><span style={{ color: C.textMuted }}>- -</span> Baseline ({baseline.paying})</span>
              <span><span style={{ color: C.blue }}>- -</span> Your rate ({convRate}%)</span>
            </div>
          </div>
        </div>

        {/* Matrix */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 2 }}>Scenario Matrix — Paying Customers per 100 Signups</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 14 }}>Baseline = {baseline.paying}. Green = win, red = loss.</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: 3, fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ padding: '6px 12px', color: C.textDim, textAlign: 'left', fontWeight: 600, fontSize: 11 }}>Drop ↓ / Conv →</th>
                  {convRates.map(c => (
                    <th key={c} style={{ padding: '6px 12px', color: C.textMuted, textAlign: 'center', fontWeight: 600 }}>{c}%</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {drops.map(drop => (
                  <tr key={drop}>
                    <td style={{ padding: '6px 12px', color: C.textMuted, fontWeight: 600 }}>{drop}%</td>
                    {convRates.map(conv => {
                      const paying = BASELINE_SIGNUPS * (1 - drop / 100) * (conv / 100);
                      const delta = paying - baseline.paying;
                      const isActive = Math.round(signupDrop / 10) * 10 === drop;
                      const win = delta >= 0;
                      return (
                        <td key={conv} style={{
                          padding: '7px 14px', textAlign: 'center',
                          background: win ? '#065F4618' : '#7F1D1D18',
                          color: win ? C.green : C.red,
                          fontWeight: 700, borderRadius: 6,
                          outline: isActive ? `1px solid ${C.blue}40` : 'none',
                        }}>
                          {paying.toFixed(1)}
                          <span style={{ fontSize: 9, color: win ? '#34D39980' : '#F8717180', display: 'block' }}>
                            {delta >= 0 ? '+' : ''}{delta.toFixed(1)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
