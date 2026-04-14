import { useEffect, useState } from "react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Line, Radar, RadarChart, PolarGrid, PolarAngleAxis } from "recharts";
import { ComposedChart } from "recharts";
import { useWorker } from "@/contexts/WorkerContext";
import { Activity, TrendingUp } from "lucide-react";
import { fetchWorkerStatistics, type WorkerStatisticsResponse } from "@/lib/api";

export default function AnalyticsDashboard() {
  const { profile } = useWorker();
  const [data, setData] = useState<WorkerStatisticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.serverId) return;

    fetchWorkerStatistics(profile.serverId)
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load statistics:", err);
        setLoading(false);
      });
  }, [profile?.serverId]);

  if (loading) {
    return <div className="h-64 flex items-center justify-center text-muted-foreground animate-pulse">Loading Analytics...</div>;
  }

  if (!data) return null;

  return (
    <div className="grid md:grid-cols-2 gap-6 mt-8">
      <div className="glass-card-premium rounded-xl p-6 md:col-span-2">
        <h3 className="font-display font-semibold mb-4">Worker Protection Snapshot</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border p-3 bg-card/60">
            <p className="text-xs text-muted-foreground">Earnings Protected (7d)</p>
            <p className="font-display font-bold text-lg">₹{data.workerSummary?.earningsProtectedINR ?? 0}</p>
          </div>
          <div className="rounded-lg border border-border p-3 bg-card/60">
            <p className="text-xs text-muted-foreground">Active Weekly Coverage</p>
            <p className="font-display font-bold text-lg">{data.workerSummary?.activeWeeklyCoverageHours ?? 0}h</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Remaining: {data.workerSummary?.coverageRemainingHours ?? 0}h
            </p>
          </div>
          <div className="rounded-lg border border-border p-3 bg-card/60">
            <p className="text-xs text-muted-foreground">Weekly Claims Settled</p>
            <p className="font-display font-bold text-lg">{data.workerSummary?.weeklyClaimsSettled ?? 0}</p>
          </div>
          <div className="rounded-lg border border-border p-3 bg-card/60">
            <p className="text-xs text-muted-foreground">Reliability Score</p>
            <p className="font-display font-bold text-lg">{data.workerSummary?.reliabilityScore ?? 0}/100</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Policy: {data.workerSummary?.activePolicyLabel ?? "unknown"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Week resets at:{" "}
          {data.workerSummary?.weekResetAt
            ? new Date(data.workerSummary.weekResetAt).toLocaleString()
            : "-"}
        </p>
      </div>

      {/* Risk vs Premium Chart */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="font-display font-semibold mb-6 flex items-center gap-2 text-primary">
          <Activity className="h-4 w-4" /> Risk vs Premium (Historical)
        </h3>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data.riskVsPremium}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground)/0.1)" />
              <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                itemStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
              <Bar yAxisId="left" dataKey="riskLevel" name="Risk Level" fill="hsl(var(--destructive)/0.35)" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="premiumPaid" name="Premium Paid (₹)" stroke="hsl(var(--primary))" strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Claims Over Time Chart */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="font-display font-semibold mb-6 flex items-center gap-2 text-success">
          <TrendingUp className="h-4 w-4" /> Claims Flow (Volume/₹)
        </h3>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.claimsOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground)/0.1)" />
              <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
              <Bar dataKey="claimsCount" name="Claim Volume" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="claimsAmount" name="Total Claims Payout (₹)" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fraud Detection Stats */}
      <div className="glass-card rounded-xl p-6 md:col-span-2">
        <h3 className="font-display font-semibold mb-6 flex items-center gap-2 text-destructive">
          <Activity className="h-4 w-4" /> Fraud Detection Stats
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data.fraudStats}>
                <PolarGrid />
                <PolarAngleAxis dataKey="week" />
                <Radar name="GPS Spoofing" dataKey="gpsSpoofing" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive)/0.3)" />
                <Radar name="Fake Inactivity" dataKey="fakeInactivity" stroke="hsl(var(--accent))" fill="hsl(var(--accent)/0.25)" />
                <Radar name="Cluster Fraud" dataKey="clusterFraud" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.2)" />
                <Tooltip />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-xs text-muted-foreground">Current Fraud Score</div>
              <div className="font-display text-2xl font-bold">{data.fraudStats[0]?.fraudScore ?? 0}/100</div>
            </div>
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="text-xs text-muted-foreground">Tomorrow Risk Prediction</div>
              <div className="font-semibold mt-1">{data.tomorrowRisk.probabilityPct}%</div>
              <p className="text-xs text-muted-foreground mt-1">{data.tomorrowRisk.recommendation}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
