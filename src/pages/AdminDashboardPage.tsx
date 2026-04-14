import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Download, FileText, Search, ShieldCheck, Users, Wallet } from "lucide-react";
import AnimatedSection from "@/components/AnimatedSection";
import {
  adminSetClaimReviewFlag,
  adminUpdateClaimStatus,
  fetchAutoFlagConfig,
  adminUpdateUserPolicy,
  adminUpdateUserRisk,
  fetchAdminAuditLogs,
  resetAutoFlagConfig,
  updateAutoFlagConfig,
  type AutoFlagConfig,
  type AdminAuditLogItem,
  fetchAdminDashboard,
  type AdminDashboardResponse,
} from "@/lib/api";
import CountUp from "@/components/CountUp";
import { toast } from "sonner";

function toCsvRow(values: Array<string | number>) {
  return values
    .map((value) => `"${String(value).replace(/"/g, '""')}"`)
    .join(",");
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => toCsvRow(r)).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function sha256Hex(input: string): Promise<string> {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    return "unavailable";
  }
  const bytes = new TextEncoder().encode(input);
  const digest = await window.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userQuery, setUserQuery] = useState("");
  const [claimsStatus, setClaimsStatus] = useState<"all" | "completed" | "pending">("all");
  const [fraudFilter, setFraudFilter] = useState<"all" | "Safe" | "Suspicious" | "Risky">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [claimFlagFilter, setClaimFlagFilter] = useState("all");
  const [claimFlagQuery, setClaimFlagQuery] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [claimsPage, setClaimsPage] = useState(1);
  const [userSort, setUserSort] = useState<"name" | "fraudScore" | "riskLevel">("fraudScore");
  const [userSortDir, setUserSortDir] = useState<"asc" | "desc">("desc");
  const [claimsSort, setClaimsSort] = useState<"date" | "amount" | "status">("date");
  const [claimsSortDir, setClaimsSortDir] = useState<"asc" | "desc">("desc");
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogItem[]>([]);
  const [auditActionFilter, setAuditActionFilter] = useState("all");
  const [auditAdminFilter, setAuditAdminFilter] = useState("all");
  const [auditFromDate, setAuditFromDate] = useState("");
  const [auditToDate, setAuditToDate] = useState("");
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(50);
  const [auditPageInput, setAuditPageInput] = useState("1");
  const [auditPagination, setAuditPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [selectedAuditLog, setSelectedAuditLog] = useState<AdminAuditLogItem | null>(null);
  const [autoFlagConfig, setAutoFlagConfig] = useState<AutoFlagConfig | null>(null);
  const [configBusy, setConfigBusy] = useState(false);
  const [payoutQuery, setPayoutQuery] = useState("");
  const [payoutStatusFilter, setPayoutStatusFilter] = useState("all");
  const [payoutGatewayFilter, setPayoutGatewayFilter] = useState("all");
  const [payoutFailedOnly, setPayoutFailedOnly] = useState(false);
  const [payoutFromDate, setPayoutFromDate] = useState("");
  const [payoutToDate, setPayoutToDate] = useState("");
  const [payoutPage, setPayoutPage] = useState(1);
  const [payoutSort, setPayoutSort] = useState<"settledAt" | "amount" | "attempts">("settledAt");
  const [payoutSortDir, setPayoutSortDir] = useState<"asc" | "desc">("desc");
  const [verifyResult, setVerifyResult] = useState<null | { ok: boolean; message: string }>(null);

  const USERS_PAGE_SIZE = 10;
  const CLAIMS_PAGE_SIZE = 10;
  const PAYOUTS_PAGE_SIZE = 10;

  const toggleUserSort = (field: "name" | "fraudScore" | "riskLevel") => {
    if (userSort === field) {
      setUserSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setUserSort(field);
    setUserSortDir(field === "name" ? "asc" : "desc");
  };

  const toggleClaimsSort = (field: "date" | "amount" | "status") => {
    if (claimsSort === field) {
      setClaimsSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setClaimsSort(field);
    setClaimsSortDir(field === "status" ? "asc" : "desc");
  };

  const sortIndicator = (
    active: boolean,
    dir: "asc" | "desc"
  ) => (active ? (dir === "asc" ? " ↑" : " ↓") : "");

  const togglePayoutSort = (field: "settledAt" | "amount" | "attempts") => {
    if (payoutSort === field) {
      setPayoutSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setPayoutSort(field);
    setPayoutSortDir(field === "settledAt" ? "desc" : "asc");
  };

  const loadAuditLogs = async (filters?: {
    actionType?: string;
    adminEmail?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) => {
    const logs = await fetchAdminAuditLogs({
      page: filters?.page ?? auditPage,
      limit: filters?.limit ?? auditPageSize,
      actionType: filters?.actionType ?? auditActionFilter,
      adminEmail: filters?.adminEmail ?? auditAdminFilter,
      from: filters?.from ?? auditFromDate,
      to: filters?.to ?? auditToDate,
    });
    setAuditLogs(logs.items);
    setAuditPagination(logs.pagination);
    setAuditPageInput(String(logs.pagination.page));
  };

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminDashboard();
      setData(res);
      const config = await fetchAutoFlagConfig();
      setAutoFlagConfig(config);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await loadDashboard();
    })();
  }, []);

  useEffect(() => {
    void loadAuditLogs();
  }, [auditActionFilter, auditAdminFilter, auditFromDate, auditToDate, auditPage, auditPageSize]);

  useEffect(() => {
    setAuditPage(1);
  }, [auditActionFilter, auditAdminFilter, auditFromDate, auditToDate]);

  const usersTable = data?.usersTable ?? [];
  const claimsTable = data?.claimsTable ?? [];
  const claimFlagOptions = useMemo(() => {
    const flags = new Set<string>();
    for (const claim of claimsTable) {
      for (const flag of claim.reviewFlags ?? []) flags.add(flag);
    }
    return Array.from(flags).sort();
  }, [claimsTable]);

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    const base = usersTable.filter((u) => {
      const textMatch =
        q.length === 0 ||
        u.name.toLowerCase().includes(q) ||
        u.zone.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q);
      const fraudMatch = fraudFilter === "all" || u.fraudLabel === fraudFilter;
      return textMatch && fraudMatch;
    });
    const sorted = [...base].sort((a, b) => {
      let comp = 0;
      if (userSort === "name") comp = a.name.localeCompare(b.name);
      if (userSort === "fraudScore") comp = a.fraudScore - b.fraudScore;
      if (userSort === "riskLevel") comp = a.riskLevel.localeCompare(b.riskLevel);
      return userSortDir === "asc" ? comp : -comp;
    });
    return sorted;
  }, [fraudFilter, userQuery, userSort, userSortDir, usersTable]);

  const filteredClaims = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    const flagQuery = claimFlagQuery.trim().toLowerCase();
    const fromTs = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const toTs = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;
    const base = claimsTable.filter((c) => {
      const normalizedStatus = c.status === "completed" ? "completed" : "pending";
      const statusMatch = claimsStatus === "all" || normalizedStatus === claimsStatus;
      const claimTs = c.date ? new Date(c.date).getTime() : null;
      const fromMatch = fromTs === null || (claimTs !== null && claimTs >= fromTs);
      const toMatch = toTs === null || (claimTs !== null && claimTs <= toTs);
      const textMatch =
        q.length === 0 ||
        c.user.toLowerCase().includes(q) ||
        c.reason.toLowerCase().includes(q);
      const byFlag =
        claimFlagFilter === "all" ||
        (claimFlagFilter === "none" ? (c.reviewFlags ?? []).length === 0 : (c.reviewFlags ?? []).includes(claimFlagFilter));
      const flagTextMatch =
        flagQuery.length === 0 || (c.reviewFlags ?? []).some((flag) => flag.toLowerCase().includes(flagQuery));
      return statusMatch && textMatch && fromMatch && toMatch && byFlag && flagTextMatch;
    });
    const sorted = [...base].sort((a, b) => {
      let comp = 0;
      if (claimsSort === "amount") comp = a.amount - b.amount;
      if (claimsSort === "status") comp = a.status.localeCompare(b.status);
      if (claimsSort === "date") {
        const at = a.date ? new Date(a.date).getTime() : 0;
        const bt = b.date ? new Date(b.date).getTime() : 0;
        comp = at - bt;
      }
      return claimsSortDir === "asc" ? comp : -comp;
    });
    return sorted;
  }, [claimFlagFilter, claimFlagQuery, claimsSort, claimsSortDir, claimsStatus, fromDate, toDate, userQuery, claimsTable]);

  useEffect(() => {
    setUserPage(1);
  }, [userQuery, fraudFilter, userSort, userSortDir]);

  useEffect(() => {
    setClaimsPage(1);
  }, [userQuery, claimsStatus, claimsSort, claimsSortDir, fromDate, toDate, claimFlagFilter, claimFlagQuery]);

  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PAGE_SIZE));
  const totalClaimsPages = Math.max(1, Math.ceil(filteredClaims.length / CLAIMS_PAGE_SIZE));
  const pagedUsers = filteredUsers.slice((userPage - 1) * USERS_PAGE_SIZE, userPage * USERS_PAGE_SIZE);
  const pagedClaims = filteredClaims.slice((claimsPage - 1) * CLAIMS_PAGE_SIZE, claimsPage * CLAIMS_PAGE_SIZE);

  const operationsKpis = useMemo(() => {
    const approvedClaims = claimsTable.filter((c) => c.status === "completed");
    const pendingClaims = claimsTable.filter((c) => c.status !== "completed");
    const flaggedClaims = claimsTable.filter((c) => c.adminReviewRequired).length;
    const riskyUsers = usersTable.filter((u) => u.fraudLabel === "Risky").length;
    const suspiciousUsers = usersTable.filter((u) => u.fraudLabel === "Suspicious").length;
    const averageFraudScore = usersTable.length
      ? Math.round(
          usersTable.reduce((sum, u) => sum + Number(u.fraudScore ?? 0), 0) / usersTable.length
        )
      : 0;
    return {
      approvedClaims: approvedClaims.length,
      pendingClaims: pendingClaims.length,
      flaggedClaims,
      riskyUsers,
      suspiciousUsers,
      averageFraudScore,
    };
  }, [claimsTable, usersTable]);

  const auditActionOptions = useMemo(() => {
    const values = Array.from(new Set(auditLogs.map((l) => l.actionType))).sort();
    return values;
  }, [auditLogs]);

  const auditAdminOptions = useMemo(() => {
    const values = Array.from(new Set(auditLogs.map((l) => l.adminEmail))).sort();
    return values;
  }, [auditLogs]);

  const filteredAuditLogs = auditLogs;

  const payoutStatusOptions = useMemo(
    () => Array.from(new Set((data?.payoutsTable ?? []).map((p) => p.status))).sort(),
    [data?.payoutsTable]
  );
  const payoutGatewayOptions = useMemo(
    () => Array.from(new Set((data?.payoutsTable ?? []).map((p) => p.gateway))).sort(),
    [data?.payoutsTable]
  );
  const filteredPayouts = useMemo(() => {
    const q = payoutQuery.trim().toLowerCase();
    const fromTs = payoutFromDate ? new Date(`${payoutFromDate}T00:00:00`).getTime() : null;
    const toTs = payoutToDate ? new Date(`${payoutToDate}T23:59:59`).getTime() : null;
    const base = (data?.payoutsTable ?? []).filter((p) => {
      const textMatch =
        q.length === 0 ||
        p.user.toLowerCase().includes(q) ||
        p.reference.toLowerCase().includes(q) ||
        p.externalId.toLowerCase().includes(q);
      const statusMatch = payoutStatusFilter === "all" || p.status === payoutStatusFilter;
      const gatewayMatch = payoutGatewayFilter === "all" || p.gateway === payoutGatewayFilter;
      const failedMatch = !payoutFailedOnly || Boolean(p.failureReason);
      const ts = p.settledAt ? new Date(p.settledAt).getTime() : null;
      const fromMatch = fromTs === null || (ts !== null && ts >= fromTs);
      const toMatch = toTs === null || (ts !== null && ts <= toTs);
      return textMatch && statusMatch && gatewayMatch && failedMatch && fromMatch && toMatch;
    });
    return [...base].sort((a, b) => {
      let comp = 0;
      if (payoutSort === "amount") comp = a.amount - b.amount;
      if (payoutSort === "attempts") comp = a.attempts - b.attempts;
      if (payoutSort === "settledAt") {
        const at = a.settledAt ? new Date(a.settledAt).getTime() : 0;
        const bt = b.settledAt ? new Date(b.settledAt).getTime() : 0;
        comp = at - bt;
      }
      return payoutSortDir === "asc" ? comp : -comp;
    });
  }, [
    data?.payoutsTable,
    payoutQuery,
    payoutStatusFilter,
    payoutGatewayFilter,
    payoutFailedOnly,
    payoutFromDate,
    payoutToDate,
    payoutSort,
    payoutSortDir,
  ]);

  useEffect(() => {
    setPayoutPage(1);
  }, [payoutQuery, payoutStatusFilter, payoutGatewayFilter, payoutFailedOnly, payoutFromDate, payoutToDate, payoutSort, payoutSortDir]);

  const totalPayoutPages = Math.max(1, Math.ceil(filteredPayouts.length / PAYOUTS_PAGE_SIZE));
  const pagedPayouts = filteredPayouts.slice((payoutPage - 1) * PAYOUTS_PAGE_SIZE, payoutPage * PAYOUTS_PAGE_SIZE);
  const payoutKpis = useMemo(() => {
    const total = filteredPayouts.length;
    const captured = filteredPayouts.filter((p) => p.status === "captured").length;
    const processing = filteredPayouts.filter((p) => p.status === "processing").length;
    const failed = filteredPayouts.filter((p) => Boolean(p.failureReason)).length;
    const successRate = total > 0 ? Math.round((captured / total) * 100) : 0;
    return { total, captured, processing, failed, successRate };
  }, [filteredPayouts]);

  if (loading) {
    return (
      <div className="py-10 aurora-bg min-h-[calc(100vh-4rem)]">
        <div className="container mx-auto px-4 space-y-6 animate-pulse">
          <div className="h-24 rounded-2xl bg-muted/50" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-muted/50" />
            ))}
          </div>
          <div className="h-20 rounded-xl bg-muted/50" />
          <div className="h-72 rounded-xl bg-muted/50" />
          <div className="h-72 rounded-xl bg-muted/50" />
          <div className="h-64 rounded-xl bg-muted/50" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-16 text-center">
        <div className="inline-flex items-center gap-2 text-destructive mb-3">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-medium">Unable to load admin dashboard</span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{error ?? "Unknown error occurred."}</p>
        <button
          onClick={() => void loadDashboard()}
          className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const exportUsersCsv = () => {
    const rows = [
      ["Name", "Role", "Zone", "Risk Level", "Risk Score", "Fraud Score", "Fraud Label", "Policy", "Weekly Premium"],
      ...filteredUsers.map((u) => [
        u.name,
        u.role,
        u.zone,
        u.riskLevel,
        String(u.riskScore),
        String(u.fraudScore),
        u.fraudLabel,
        u.policyActive ? "active" : "inactive",
        String(u.weeklyPremium),
      ]),
    ];
    downloadCsv("admin-users.csv", rows);
  };

  const exportClaimsCsv = () => {
    const rows = [
      ["User", "Amount", "Status", "Review Flags", "Reason", "Date"],
      ...filteredClaims.map((c) => [
        c.user,
        `INR ${c.amount}`,
        c.status === "completed" ? "Approved" : "Pending",
        (c.reviewFlags ?? []).join(" | ") || "-",
        c.reason || "-",
        c.date ? new Date(c.date).toISOString() : "-",
      ]),
    ];
    downloadCsv("admin-claims.csv", rows);
  };

  const exportPayoutsCsv = () => {
    const rows = [
      ["Claim Id", "External Id", "User", "Amount", "Gateway", "Reference", "Status", "Settled At", "Attempts", "Failure Reason", "Mode"],
      ...filteredPayouts.map((p) => [
        p.claimId,
        p.externalId,
        p.user,
        `INR ${p.amount}`,
        p.gateway,
        p.reference,
        p.status,
        p.settledAt ? new Date(p.settledAt).toISOString() : "-",
        String(p.attempts),
        p.failureReason || "-",
        p.sandbox ? "sandbox" : "live",
      ]),
    ];
    downloadCsv("admin-payout-transactions.csv", rows);
  };

  const exportAuditCsv = () => {
    const rows = [
      ["Time", "Admin Email", "Action Type", "Target Type", "Target Id", "Note"],
      ...filteredAuditLogs.map((log) => [
        new Date(log.createdAt).toISOString(),
        log.adminEmail,
        log.actionType,
        log.targetType,
        log.targetId,
        log.note || "",
      ]),
    ];
    downloadCsv("admin-audit-log.csv", rows);
  };

  const exportForecastCsv = () => {
    if (!data?.insurerIntelligence) return;
    const intel = data.insurerIntelligence;
    const rows = [
      ["Metric", "Value"],
      ["Current Loss Ratio", `${Math.round(intel.currentLossRatio * 100)}%`],
      ["Projected Loss Ratio (Base)", `${Math.round(intel.projectedLossRatioBase * 100)}%`],
      ["Likely Weather Claims (Next Week)", String(intel.likelyWeatherClaims)],
      ["Likely Disruption Claims (Next Week)", String(intel.likelyDisruptionClaims)],
      ["Predicted Next Week Payout", `INR ${intel.predictedNextWeekPayout}`],
      ["Predicted Next Week Premium", `INR ${intel.predictedNextWeekPremium}`],
      ["Forecast Confidence", `${intel.confidenceScore}%`],
      ["Weather Payout Share", `${Math.round(intel.weatherPayoutShare * 100)}%`],
      ["Disruption Payout Share", `${Math.round(intel.disruptionPayoutShare * 100)}%`],
      ["Recommendation", intel.recommendation],
      [""],
      ["Scenario", "Likely Claims", "Likely Payout", "Projected Loss Ratio"],
      ...intel.scenarios.map((s) => [
        s.name,
        String(s.likelyClaims),
        `INR ${s.likelyPayout}`,
        `${Math.round(s.projectedLossRatio * 100)}%`,
      ]),
    ];
    downloadCsv(`insurer-forecast-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const exportForecastJson = async () => {
    if (!data?.insurerIntelligence) return;
    const reportVersion = "insurer-forecast.v1";
    const corePayload = {
      reportVersion,
      generatedAt: new Date().toISOString(),
      portfolioTotals: data.totals,
      fraudSignals: data.fraudSignals ?? null,
      insurerIntelligence: data.insurerIntelligence,
    };
    const canonical = JSON.stringify(corePayload);
    const reportHash = await sha256Hex(canonical);
    downloadJson(`insurer-forecast-${new Date().toISOString().slice(0, 10)}.json`, {
      ...corePayload,
      reportHash,
      hashAlgorithm: "SHA-256",
    });
  };

  const handleVerifyForecastReport = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Record<string, unknown>;
      const reportHash = String(parsed.reportHash ?? "");
      const hashAlgorithm = String(parsed.hashAlgorithm ?? "");
      if (!reportHash || hashAlgorithm !== "SHA-256") {
        setVerifyResult({ ok: false, message: "Missing or unsupported hash metadata." });
        return;
      }

      const canonicalPayload = {
        reportVersion: parsed.reportVersion,
        generatedAt: parsed.generatedAt,
        portfolioTotals: parsed.portfolioTotals,
        fraudSignals: parsed.fraudSignals,
        insurerIntelligence: parsed.insurerIntelligence,
      };
      const recomputed = await sha256Hex(JSON.stringify(canonicalPayload));
      if (recomputed === reportHash) {
        setVerifyResult({ ok: true, message: "Integrity verified. Report hash matches payload." });
      } else {
        setVerifyResult({ ok: false, message: "Integrity check failed. Report payload may have been modified." });
      }
    } catch {
      setVerifyResult({ ok: false, message: "Invalid JSON file. Please upload a valid forecast report." });
    }
  };

  const handleClaimAction = async (claimId: string, status: "completed" | "rejected") => {
    try {
      setActionBusyId(`claim-${claimId}`);
      await adminUpdateClaimStatus(claimId, {
        status,
        adminNote: status === "completed" ? "Approved by admin ops desk" : "Rejected by admin review",
      });
      toast.success(status === "completed" ? "Claim approved." : "Claim rejected.");
      await loadDashboard();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to update claim.");
    } finally {
      setActionBusyId(null);
    }
  };

  const handleReviewFlag = async (claimId: string, reviewRequired: boolean) => {
    try {
      setActionBusyId(`flag-${claimId}`);
      await adminSetClaimReviewFlag(claimId, {
        reviewRequired,
        adminNote: reviewRequired ? "Escalated for manual review" : "Returned to AI-final state",
      });
      toast.success(reviewRequired ? "Claim flagged for manual review." : "Claim removed from manual review.");
      await loadDashboard();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to update review flag.");
    } finally {
      setActionBusyId(null);
    }
  };

  const claimStatusLabel = (claim: { status: string; decisionSource: string; adminReviewRequired: boolean }) => {
    if (claim.adminReviewRequired) return "Flagged for Review";
    if (claim.decisionSource === "ai" && claim.status === "completed") return "Auto-Approved";
    if (claim.decisionSource === "ai" && claim.status === "rejected") return "Auto-Rejected";
    if (claim.decisionSource === "admin_override" && claim.status === "completed") return "Approved by Admin";
    if (claim.decisionSource === "admin_override" && claim.status === "rejected") return "Rejected by Admin";
    return claim.status === "completed" ? "Approved" : "Pending";
  };

  const formatReviewFlag = (flag: string) =>
    flag
      .replace(/_/g, " ")
      .replace(/:/g, " - ")
      .replace(/\b\w/g, (ch) => ch.toUpperCase());

  const handlePolicyToggle = async (userId: string, active: boolean) => {
    try {
      setActionBusyId(`policy-${userId}`);
      await adminUpdateUserPolicy(userId, { active: !active });
      toast.success(!active ? "Policy activated." : "Policy deactivated.");
      await loadDashboard();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to update policy.");
    } finally {
      setActionBusyId(null);
    }
  };

  const handlePremiumUpdate = async (userId: string, currentPremium: number) => {
    const input = window.prompt("Enter weekly premium (INR):", String(currentPremium));
    if (!input) return;
    const nextPremium = Number(input);
    if (Number.isNaN(nextPremium) || nextPremium < 0) {
      toast.error("Please enter a valid premium amount.");
      return;
    }
    try {
      setActionBusyId(`premium-${userId}`);
      await adminUpdateUserPolicy(userId, { weeklyPremium: nextPremium });
      toast.success("Weekly premium updated.");
      await loadDashboard();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to update premium.");
    } finally {
      setActionBusyId(null);
    }
  };

  const handleRiskReclassify = async (userId: string, currentRisk: string, currentScore: number) => {
    const nextRiskRaw = window.prompt("Set risk level: low | medium | high", currentRisk);
    if (!nextRiskRaw) return;
    const nextRisk = nextRiskRaw.toLowerCase();
    if (!["low", "medium", "high"].includes(nextRisk)) {
      toast.error("Risk level must be low, medium, or high.");
      return;
    }
    const scoreRaw = window.prompt("Set risk score (0-100)", String(currentScore));
    if (!scoreRaw) return;
    const nextScore = Number(scoreRaw);
    if (Number.isNaN(nextScore) || nextScore < 0 || nextScore > 100) {
      toast.error("Risk score must be between 0 and 100.");
      return;
    }
    try {
      setActionBusyId(`risk-${userId}`);
      await adminUpdateUserRisk(userId, {
        riskLevel: nextRisk as "low" | "medium" | "high",
        riskScore: nextScore,
      });
      toast.success("Risk classification updated.");
      await loadDashboard();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to update risk.");
    } finally {
      setActionBusyId(null);
    }
  };

  const handleSaveAutoFlagConfig = async () => {
    if (!autoFlagConfig || !autoFlagConfig.canEdit) return;
    try {
      setConfigBusy(true);
      const res = await updateAutoFlagConfig(autoFlagConfig);
      setAutoFlagConfig(res.config);
      toast.success("Auto-flag thresholds updated.");
      await loadDashboard();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to update auto-flag thresholds.");
    } finally {
      setConfigBusy(false);
    }
  };

  const handleResetAutoFlagConfig = async () => {
    if (!autoFlagConfig || !autoFlagConfig.canEdit) return;
    const ok = window.confirm("Reset auto-flag thresholds to default values?");
    if (!ok) return;
    try {
      setConfigBusy(true);
      const res = await resetAutoFlagConfig();
      setAutoFlagConfig({ ...res.config, canEdit: true });
      toast.success("Auto-flag thresholds reset to defaults.");
      await loadDashboard();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to reset auto-flag thresholds.");
    } finally {
      setConfigBusy(false);
    }
  };

  return (
    <div className="py-10 aurora-bg min-h-[calc(100vh-4rem)]">
      <div className="container mx-auto px-4 space-y-6">
        <AnimatedSection>
          <div className="glass-card-premium gradient-frame rounded-2xl p-6 neon-ring card-lift">
            <h1 className="font-display text-3xl font-bold text-gradient">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Portfolio KPIs, claims operations, and fraud risk controls.</p>
          </div>
        </AnimatedSection>

        <AnimatedSection>
          <div className="glass-card-premium rounded-xl p-5">
            <h3 className="font-display font-semibold mb-4">Operations Controls</h3>
            <div className="grid md:grid-cols-4 gap-3">
              <div className="relative md:col-span-2">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="Search by user, zone, role, or claim reason"
                  className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <select
                value={fraudFilter}
                onChange={(e) => setFraudFilter(e.target.value as "all" | "Safe" | "Suspicious" | "Risky")}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">All Fraud Labels</option>
                <option value="Safe">Safe</option>
                <option value="Suspicious">Suspicious</option>
                <option value="Risky">Risky</option>
              </select>
              <select
                value={claimsStatus}
                onChange={(e) => setClaimsStatus(e.target.value as "all" | "completed" | "pending")}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">All Claims</option>
                <option value="completed">Approved Claims</option>
                <option value="pending">Pending Claims</option>
              </select>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection>
          <div className="glass-card-premium rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="font-display font-semibold">Auto-Flag Rules Config</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void handleResetAutoFlagConfig()}
                  disabled={!autoFlagConfig || configBusy || !autoFlagConfig.canEdit}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
                >
                  Reset Defaults
                </button>
                <button
                  onClick={() => void handleSaveAutoFlagConfig()}
                  disabled={!autoFlagConfig || configBusy || !autoFlagConfig.canEdit}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
                >
                  {configBusy ? "Saving..." : "Save Thresholds"}
                </button>
              </div>
            </div>
            {autoFlagConfig && !autoFlagConfig.canEdit && (
              <p className="text-xs text-muted-foreground mb-3">
                View-only mode: only super-admin can modify auto-flag thresholds.
              </p>
            )}
            {autoFlagConfig ? (
              <div className="grid md:grid-cols-5 gap-3">
                <label className="text-xs text-muted-foreground space-y-1">
                  <span>Fraud Score Threshold</span>
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={autoFlagConfig.fraudScoreThreshold}
                    onChange={(e) =>
                      setAutoFlagConfig((prev) => (prev ? { ...prev, fraudScoreThreshold: Number(e.target.value) } : prev))
                    }
                    disabled={!autoFlagConfig.canEdit}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-muted-foreground space-y-1">
                  <span>Near Limit Ratio</span>
                  <input
                    type="number"
                    min={0.5}
                    max={1}
                    step={0.01}
                    value={autoFlagConfig.nearLimitRatio}
                    onChange={(e) =>
                      setAutoFlagConfig((prev) => (prev ? { ...prev, nearLimitRatio: Number(e.target.value) } : prev))
                    }
                    disabled={!autoFlagConfig.canEdit}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-muted-foreground space-y-1">
                  <span>Claims in 24h Threshold</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    step={1}
                    value={autoFlagConfig.claims24hThreshold}
                    onChange={(e) =>
                      setAutoFlagConfig((prev) => (prev ? { ...prev, claims24hThreshold: Number(e.target.value) } : prev))
                    }
                    disabled={!autoFlagConfig.canEdit}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-muted-foreground space-y-1">
                  <span>Repeat Type 7d Threshold</span>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    step={1}
                    value={autoFlagConfig.repeatType7dThreshold}
                    onChange={(e) =>
                      setAutoFlagConfig((prev) => (prev ? { ...prev, repeatType7dThreshold: Number(e.target.value) } : prev))
                    }
                    disabled={!autoFlagConfig.canEdit}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-muted-foreground space-y-2">
                  <span>Weak Signal Auto-Flag</span>
                  <button
                    type="button"
                    onClick={() =>
                      setAutoFlagConfig((prev) => (prev ? { ...prev, weakSignalEnabled: !prev.weakSignalEnabled } : prev))
                    }
                    disabled={!autoFlagConfig.canEdit}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-left"
                  >
                    {autoFlagConfig.weakSignalEnabled ? "Enabled" : "Disabled"}
                  </button>
                </label>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Auto-flag configuration unavailable.</p>
            )}
          </div>
        </AnimatedSection>

        <AnimatedSection>
          <div className="glass-card-premium rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="font-display font-semibold">Admin Actions Audit Log</h3>
              <div className="flex items-center gap-2">
                <select
                  value={String(auditPageSize)}
                  onChange={(e) => setAuditPageSize(Number(e.target.value))}
                  className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="25">25 / page</option>
                  <option value="50">50 / page</option>
                  <option value="100">100 / page</option>
                </select>
                <button
                  onClick={exportAuditCsv}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Export Audit CSV
                </button>
              </div>
            </div>
            <div className="grid md:grid-cols-4 gap-3 mb-4">
              <select
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">All Actions</option>
                {auditActionOptions.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
              <select
                value={auditAdminFilter}
                onChange={(e) => setAuditAdminFilter(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">All Admins</option>
                {auditAdminOptions.map((admin) => (
                  <option key={admin} value={admin}>
                    {admin}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={auditFromDate}
                onChange={(e) => setAuditFromDate(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="date"
                value={auditToDate}
                onChange={(e) => setAuditToDate(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="mb-4 rounded-lg border border-border bg-card/60 p-3">
              <p className="text-xs font-medium mb-2">Flagged Review Queue ({operationsKpis.flaggedClaims})</p>
              <div className="space-y-2">
                {claimsTable
                  .filter((c) => c.adminReviewRequired)
                  .slice(0, 5)
                  .map((c) => (
                    <div key={`queue-${c.id}`} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="space-y-1">
                        <span>
                          {c.user} - ₹{c.amount} - {c.date ? new Date(c.date).toLocaleDateString() : "-"}
                        </span>
                        {(c.reviewFlags ?? []).length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {(c.reviewFlags ?? []).map((flag) => (
                              <span key={`${c.id}-${flag}`} className="rounded-full bg-accent/15 text-accent px-2 py-0.5">
                                {formatReviewFlag(flag)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => void handleClaimAction(c.id, "completed")}
                          disabled={actionBusyId === `claim-${c.id}`}
                          className="rounded border border-border px-2 py-1 hover:bg-muted disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => void handleClaimAction(c.id, "rejected")}
                          disabled={actionBusyId === `claim-${c.id}`}
                          className="rounded border border-border px-2 py-1 hover:bg-muted disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                {operationsKpis.flaggedClaims === 0 && (
                  <p className="text-xs text-muted-foreground">No claims are waiting for manual review.</p>
                )}
              </div>
            </div>
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-sm min-w-[820px]">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border/50">
                    <th className="py-2 pr-3">Time</th>
                    <th className="py-2 pr-3">Admin</th>
                    <th className="py-2 pr-3">Action</th>
                    <th className="py-2 pr-3">Target</th>
                    <th className="py-2 pr-3">Note</th>
                    <th className="py-2 pr-3">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAuditLogs.slice(0, 60).map((log) => (
                    <tr key={log.id} className="border-b border-border/30">
                      <td className="py-2 pr-3 text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="py-2 pr-3">{log.adminEmail}</td>
                      <td className="py-2 pr-3">{log.actionType}</td>
                      <td className="py-2 pr-3 text-xs">
                        {log.targetType}:{log.targetId}
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{log.note || "-"}</td>
                      <td className="py-2 pr-3">
                        <button
                          onClick={() => setSelectedAuditLog(log)}
                          className="rounded border border-border px-2 py-1 text-xs hover:bg-muted"
                        >
                          View Metadata
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredAuditLogs.length === 0 && (
                    <tr>
                      <td className="py-6 text-center text-muted-foreground" colSpan={6}>
                        No audit entries match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="md:hidden mt-4 space-y-3">
              {filteredAuditLogs.slice(0, 40).map((log) => (
                <div key={`m-audit-${log.id}`} className="rounded-lg border border-border p-3 bg-card/60">
                  <p className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</p>
                  <p className="text-sm font-medium mt-1">{log.actionType}</p>
                  <p className="text-xs text-muted-foreground mt-1">{log.adminEmail}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {log.targetType}:{log.targetId}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{log.note || "-"}</p>
                  <button
                    onClick={() => setSelectedAuditLog(log)}
                    className="mt-2 rounded border border-border px-2 py-1 text-xs hover:bg-muted"
                  >
                    View Metadata
                  </button>
                </div>
              ))}
              {filteredAuditLogs.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No audit entries match the selected filters.
                </p>
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                Page {auditPagination.page} of {auditPagination.totalPages} - Total {auditPagination.total} entries
              </span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span>Go to</span>
                  <input
                    type="number"
                    min={1}
                    max={auditPagination.totalPages}
                    value={auditPageInput}
                    onChange={(e) => setAuditPageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      const parsed = Number(auditPageInput);
                      if (!Number.isFinite(parsed)) return;
                      const next = Math.max(1, Math.min(auditPagination.totalPages, Math.floor(parsed)));
                      setAuditPage(next);
                    }}
                    className="w-16 rounded border border-input bg-background px-2 py-1 text-xs"
                  />
                  <button
                    onClick={() => {
                      const parsed = Number(auditPageInput);
                      if (!Number.isFinite(parsed)) return;
                      const next = Math.max(1, Math.min(auditPagination.totalPages, Math.floor(parsed)));
                      setAuditPage(next);
                    }}
                    className="rounded border border-border px-2 py-1 hover:bg-muted"
                  >
                    Go
                  </button>
                </div>
                <button
                  onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                  disabled={auditPagination.page <= 1}
                  className="rounded border border-border px-2 py-1 hover:bg-muted disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  onClick={() => setAuditPage((p) => Math.min(auditPagination.totalPages, p + 1))}
                  disabled={auditPagination.page >= auditPagination.totalPages}
                  className="rounded border border-border px-2 py-1 hover:bg-muted disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {selectedAuditLog && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl rounded-xl border border-border bg-background p-5 shadow-xl">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h4 className="font-display text-lg font-semibold">Audit Metadata</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedAuditLog.actionType} - {new Date(selectedAuditLog.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedAuditLog(null)}
                  className="rounded border border-border px-2 py-1 text-xs hover:bg-muted"
                >
                  Close
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Admin</p>
                  <p>{selectedAuditLog.adminEmail}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Target</p>
                  <p>{selectedAuditLog.targetType}:{selectedAuditLog.targetId}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-muted-foreground">Note</p>
                  <p>{selectedAuditLog.note || "-"}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Raw Metadata JSON</p>
                <pre className="text-xs bg-muted/50 rounded-lg p-3 overflow-auto max-h-80">
{JSON.stringify(selectedAuditLog.metadata ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total Users", value: data.totals.totalUsers, icon: Users },
            { label: "Total Policies", value: data.totals.totalPolicies, icon: ShieldCheck },
            { label: "Total Claims", value: data.totals.totalClaims, icon: FileText },
            { label: "Total Payout", value: data.totals.totalPayout, icon: Wallet, prefix: "₹" },
            { label: "Total Profit", value: data.totals.totalProfit, icon: Wallet, prefix: "₹" },
          ].map((k) => (
            <AnimatedSection key={k.label}>
              <div className="glass-card-premium card-lift rounded-xl p-4">
                <k.icon className="h-5 w-5 text-primary mb-2" />
                <div className="font-display text-xl font-bold">
                  <CountUp value={k.value} prefix={k.prefix ?? ""} />
                </div>
                <div className="text-xs text-muted-foreground">{k.label}</div>
              </div>
            </AnimatedSection>
          ))}
        </div>

        {data.fraudSignals && (
          <AnimatedSection>
            <div className="glass-card-premium rounded-xl p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-display font-semibold">Weather Claim Abuse Signal</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Actual weather-linked claims vs expected historical baseline.
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-semibold ${
                    data.fraudSignals.weatherAlertLabel === "Low"
                      ? "bg-success/15 text-success"
                      : data.fraudSignals.weatherAlertLabel === "Medium"
                        ? "bg-accent/15 text-accent"
                        : "bg-destructive/15 text-destructive"
                  }`}
                >
                  {data.fraudSignals.weatherAlertLabel} Alert
                </span>
              </div>
              <div className="grid md:grid-cols-3 gap-3 mt-4 text-sm">
                <div className="rounded-lg border border-border p-3 bg-card/60">
                  <p className="text-xs text-muted-foreground">Actual Weather Claim Ratio</p>
                  <p className="font-semibold">{Math.round(data.fraudSignals.weatherClaimRatio * 100)}%</p>
                </div>
                <div className="rounded-lg border border-border p-3 bg-card/60">
                  <p className="text-xs text-muted-foreground">Expected Baseline Ratio</p>
                  <p className="font-semibold">{Math.round(data.fraudSignals.expectedWeatherRatio * 100)}%</p>
                </div>
                <div className="rounded-lg border border-border p-3 bg-card/60">
                  <p className="text-xs text-muted-foreground">Abuse Delta</p>
                  <p className="font-semibold">+{Math.round(data.fraudSignals.weatherAbuseDelta * 100)}%</p>
                </div>
              </div>
              {data.fraudSignals.autoTuned && (
                <p className="text-xs text-accent mt-3">
                  Auto-defense applied: claim flag thresholds were tightened due to High alert.
                </p>
              )}
            </div>
          </AnimatedSection>
        )}

        {data.insurerIntelligence && (
          <AnimatedSection>
            <div className="glass-card-premium rounded-xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h3 className="font-display font-semibold">Insurer Loss Ratio & Predictive Intelligence</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Confidence: {data.insurerIntelligence.confidenceScore}%
                  </span>
                  <button
                    onClick={exportForecastCsv}
                    className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs hover:bg-muted"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export CSV
                  </button>
                  <button
                    onClick={() => void exportForecastJson()}
                    className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs hover:bg-muted"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export JSON
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                <div className="rounded-lg border border-border p-3 bg-card/60">
                  <p className="text-xs text-muted-foreground">Current Loss Ratio</p>
                  <p className="font-semibold">{Math.round(data.insurerIntelligence.currentLossRatio * 100)}%</p>
                </div>
                <div className="rounded-lg border border-border p-3 bg-card/60">
                  <p className="text-xs text-muted-foreground">Projected Loss Ratio</p>
                  <p className="font-semibold">{Math.round(data.insurerIntelligence.projectedLossRatioBase * 100)}%</p>
                </div>
                <div className="rounded-lg border border-border p-3 bg-card/60">
                  <p className="text-xs text-muted-foreground">Likely Weather Claims</p>
                  <p className="font-semibold">{data.insurerIntelligence.likelyWeatherClaims}</p>
                </div>
                <div className="rounded-lg border border-border p-3 bg-card/60">
                  <p className="text-xs text-muted-foreground">Likely Disruption Claims</p>
                  <p className="font-semibold">{data.insurerIntelligence.likelyDisruptionClaims}</p>
                </div>
                <div className="rounded-lg border border-border p-3 bg-card/60">
                  <p className="text-xs text-muted-foreground">Predicted Next Week Payout</p>
                  <p className="font-semibold">₹{data.insurerIntelligence.predictedNextWeekPayout}</p>
                </div>
              </div>
              {data.insurerIntelligence.governance && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-lg border border-border p-3 bg-card/60">
                    <p className="text-xs text-muted-foreground">Reserve Adequacy Ratio</p>
                    <p className="font-semibold">{data.insurerIntelligence.governance.reserveAdequacyRatio}x</p>
                    <p
                      className={`text-xs mt-1 ${
                        data.insurerIntelligence.governance.reserveStatus === "healthy"
                          ? "text-success"
                          : data.insurerIntelligence.governance.reserveStatus === "watch"
                            ? "text-accent"
                            : "text-destructive"
                      }`}
                    >
                      Status: {data.insurerIntelligence.governance.reserveStatus.toUpperCase()}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3 bg-card/60">
                    <p className="text-xs text-muted-foreground">Avg Claim Turnaround (TAT)</p>
                    <p className="font-semibold">{data.insurerIntelligence.governance.avgClaimSettlementHours}h</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 bg-card/60">
                    <p className="text-xs text-muted-foreground">TAT Breaches ({">24h"})</p>
                    <p className="font-semibold">{data.insurerIntelligence.governance.tatBreaches24h}</p>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto hidden md:block mb-4">
                <table className="w-full text-sm min-w-[620px]">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border/50">
                      <th className="py-2 pr-3">Scenario</th>
                      <th className="py-2 pr-3">Likely Claims</th>
                      <th className="py-2 pr-3">Likely Payout</th>
                      <th className="py-2 pr-3">Projected Loss Ratio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.insurerIntelligence.scenarios.map((s) => (
                      <tr key={s.name} className="border-b border-border/30">
                        <td className="py-2 pr-3 capitalize">{s.name}</td>
                        <td className="py-2 pr-3">{s.likelyClaims}</td>
                        <td className="py-2 pr-3">₹{s.likelyPayout}</td>
                        <td className="py-2 pr-3">{Math.round(s.projectedLossRatio * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">
                Recommendation: {data.insurerIntelligence.recommendation}
              </p>
              <div className="mt-4 rounded-lg border border-border p-3 bg-card/50">
                <p className="text-xs font-medium mb-2">Verify Forecast Report Hash</p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={(e) => void handleVerifyForecastReport(e.target.files?.[0] ?? null)}
                    className="text-xs"
                  />
                  <button
                    onClick={() => setVerifyResult(null)}
                    className="rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                  >
                    Clear Result
                  </button>
                </div>
                {verifyResult && (
                  <p className={`text-xs mt-2 ${verifyResult.ok ? "text-success" : "text-destructive"}`}>
                    {verifyResult.message}
                  </p>
                )}
              </div>
            </div>
          </AnimatedSection>
        )}

        <AnimatedSection>
          <div className="glass-card-premium rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="font-display font-semibold">User Risk and Fraud Table</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportUsersCsv}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Export Users CSV
                </button>
              </div>
            </div>
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-sm min-w-[760px]">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border/50">
                    <th className="py-2 pr-3">
                      <button type="button" onClick={() => toggleUserSort("name")} className="hover:text-foreground">
                        Name{sortIndicator(userSort === "name", userSortDir)}
                      </button>
                    </th>
                    <th className="py-2 pr-3">Role</th>
                    <th className="py-2 pr-3">Zone</th>
                    <th className="py-2 pr-3">
                      <button type="button" onClick={() => toggleUserSort("riskLevel")} className="hover:text-foreground">
                        Risk Level{sortIndicator(userSort === "riskLevel", userSortDir)}
                      </button>
                    </th>
                    <th className="py-2 pr-3">
                      <button type="button" onClick={() => toggleUserSort("fraudScore")} className="hover:text-foreground">
                        Fraud Score{sortIndicator(userSort === "fraudScore", userSortDir)}
                      </button>
                    </th>
                    <th className="py-2 pr-3">Fraud Label</th>
                    <th className="py-2 pr-3">Policy</th>
                    <th className="py-2 pr-3">Premium</th>
                    <th className="py-2 pr-3">Admin Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedUsers.map((u) => (
                    <tr key={u.id} className="border-b border-border/30">
                      <td className="py-2 pr-3">{u.name}</td>
                      <td className="py-2 pr-3 capitalize">{u.role}</td>
                      <td className="py-2 pr-3">{u.zone}</td>
                      <td className="py-2 pr-3 capitalize">{u.riskLevel}</td>
                      <td className="py-2 pr-3">{u.fraudScore}</td>
                      <td className="py-2 pr-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          u.fraudLabel === "Safe"
                            ? "bg-success/15 text-success"
                            : u.fraudLabel === "Suspicious"
                              ? "bg-accent/15 text-accent"
                              : "bg-destructive/15 text-destructive"
                        }`}>
                          {u.fraudLabel}
                        </span>
                      </td>
                      <td className="py-2 pr-3">{u.policyActive ? "Active" : "Inactive"}</td>
                      <td className="py-2 pr-3">₹{u.weeklyPremium}</td>
                      <td className="py-2 pr-3">
                        <div className="flex flex-wrap gap-1">
                          <button
                            onClick={() => void handlePolicyToggle(u.id, u.policyActive)}
                            disabled={actionBusyId === `policy-${u.id}`}
                            className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                          >
                            {u.policyActive ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={() => void handlePremiumUpdate(u.id, u.weeklyPremium)}
                            disabled={actionBusyId === `premium-${u.id}`}
                            className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                          >
                            Set Premium
                          </button>
                          <button
                            onClick={() => void handleRiskReclassify(u.id, u.riskLevel, u.riskScore)}
                            disabled={actionBusyId === `risk-${u.id}`}
                            className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                          >
                            Reclassify Risk
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {pagedUsers.length === 0 && (
                    <tr>
                      <td className="py-6 text-center text-muted-foreground" colSpan={9}>
                        No users match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="md:hidden mt-4 space-y-3">
              {pagedUsers.map((u) => (
                <div key={`m-${u.id}`} className="rounded-lg border border-border p-3 bg-card/60">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{u.name}</p>
                    <span className="text-xs capitalize text-muted-foreground">{u.role}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Zone: {u.zone}</p>
                  <p className="text-xs text-muted-foreground">Risk: {u.riskLevel} ({u.riskScore})</p>
                  <p className="text-xs text-muted-foreground">
                    Policy: {u.policyActive ? "Active" : "Inactive"} | Premium: ₹{u.weeklyPremium}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span>Fraud Score: {u.fraudScore}</span>
                    <span
                      className={`px-2 py-0.5 rounded ${
                        u.fraudLabel === "Safe"
                          ? "bg-success/15 text-success"
                          : u.fraudLabel === "Suspicious"
                            ? "bg-accent/15 text-accent"
                            : "bg-destructive/15 text-destructive"
                      }`}
                    >
                      {u.fraudLabel}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <button
                      onClick={() => void handlePolicyToggle(u.id, u.policyActive)}
                      disabled={actionBusyId === `policy-${u.id}`}
                      className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                    >
                      {u.policyActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => void handlePremiumUpdate(u.id, u.weeklyPremium)}
                      disabled={actionBusyId === `premium-${u.id}`}
                      className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                    >
                      Set Premium
                    </button>
                    <button
                      onClick={() => void handleRiskReclassify(u.id, u.riskLevel, u.riskScore)}
                      disabled={actionBusyId === `risk-${u.id}`}
                      className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                    >
                      Reclassify Risk
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Showing {pagedUsers.length} of {filteredUsers.length} users
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                  disabled={userPage === 1}
                  className="rounded border border-border px-2 py-1 disabled:opacity-50"
                >
                  Prev
                </button>
                <span>
                  Page {userPage} / {totalUserPages}
                </span>
                <button
                  onClick={() => setUserPage((p) => Math.min(totalUserPages, p + 1))}
                  disabled={userPage === totalUserPages}
                  className="rounded border border-border px-2 py-1 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection>
          <div className="glass-card-premium rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="font-display font-semibold">Claims Operations</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  AI handles claim decisions by default. Manual actions are only for flagged reviews.
                </span>
                <button
                  onClick={exportClaimsCsv}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Export Claims CSV
                </button>
              </div>
            </div>
            <div className="grid md:grid-cols-4 gap-3 mb-4">
              <select
                value={claimFlagFilter}
                onChange={(e) => setClaimFlagFilter(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">All Flag States</option>
                <option value="none">No Flag</option>
                {claimFlagOptions.map((flag) => (
                  <option key={flag} value={flag}>
                    {formatReviewFlag(flag)}
                  </option>
                ))}
              </select>
              <input
                value={claimFlagQuery}
                onChange={(e) => setClaimFlagQuery(e.target.value)}
                placeholder="Search flag reason"
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 md:col-span-2"
              />
              <button
                onClick={() => {
                  setClaimFlagFilter("all");
                  setClaimFlagQuery("");
                }}
                className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
              >
                Clear Flag Filters
              </button>
            </div>
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-sm min-w-[760px]">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border/50">
                    <th className="py-2 pr-3">User</th>
                    <th className="py-2 pr-3">
                      <button type="button" onClick={() => toggleClaimsSort("amount")} className="hover:text-foreground">
                        Amount{sortIndicator(claimsSort === "amount", claimsSortDir)}
                      </button>
                    </th>
                    <th className="py-2 pr-3">
                      <button type="button" onClick={() => toggleClaimsSort("status")} className="hover:text-foreground">
                        Status{sortIndicator(claimsSort === "status", claimsSortDir)}
                      </button>
                    </th>
                    <th className="py-2 pr-3">Flag Reasons</th>
                    <th className="py-2 pr-3">Reason</th>
                    <th className="py-2 pr-3">
                      <button type="button" onClick={() => toggleClaimsSort("date")} className="hover:text-foreground">
                        Date{sortIndicator(claimsSort === "date", claimsSortDir)}
                      </button>
                    </th>
                    <th className="py-2 pr-3">Admin Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedClaims.map((c) => (
                    <tr key={c.id} className="border-b border-border/30">
                      <td className="py-2 pr-3">{c.user}</td>
                      <td className="py-2 pr-3">₹{c.amount}</td>
                      <td className="py-2 pr-3 capitalize">{claimStatusLabel(c)}</td>
                      <td className="py-2 pr-3 text-xs">
                        {(c.reviewFlags ?? []).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {(c.reviewFlags ?? []).map((flag) => (
                              <span key={`${c.id}-row-${flag}`} className="rounded-full bg-accent/15 text-accent px-2 py-0.5">
                                {formatReviewFlag(flag)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{c.reason || "-"}</td>
                      <td className="py-2 pr-3 text-xs">{c.date ? new Date(c.date).toLocaleString() : "-"}</td>
                      <td className="py-2 pr-3">
                        {c.adminReviewRequired ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => void handleClaimAction(c.id, "completed")}
                              disabled={actionBusyId === `claim-${c.id}` || c.status === "completed"}
                              className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => void handleClaimAction(c.id, "rejected")}
                              disabled={actionBusyId === `claim-${c.id}` || c.status === "rejected"}
                              className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => void handleReviewFlag(c.id, false)}
                              disabled={actionBusyId === `flag-${c.id}`}
                              className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                            >
                              Unflag
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">Locked (AI final)</span>
                            <button
                              onClick={() => void handleReviewFlag(c.id, true)}
                              disabled={actionBusyId === `flag-${c.id}`}
                              className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                            >
                              Flag Review
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {pagedClaims.length === 0 && (
                    <tr>
                      <td className="py-6 text-center text-muted-foreground" colSpan={7}>
                        No claims match current search and status filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="md:hidden mt-4 space-y-3">
              {pagedClaims.map((c) => (
                <div key={`mc-${c.id}`} className="rounded-lg border border-border p-3 bg-card/60">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{c.user}</p>
                    <span className="text-xs">{claimStatusLabel(c)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Amount: ₹{c.amount}</p>
                  <p className="text-xs text-muted-foreground mt-1">{c.reason || "-"}</p>
                  {(c.reviewFlags ?? []).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(c.reviewFlags ?? []).map((flag) => (
                        <span key={`${c.id}-mobile-${flag}`} className="rounded-full bg-accent/15 text-accent px-2 py-0.5 text-[10px]">
                          {formatReviewFlag(flag)}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {c.date ? new Date(c.date).toLocaleString() : "-"}
                  </p>
                  {c.adminReviewRequired ? (
                    <div className="mt-2 flex gap-1">
                      <button
                        onClick={() => void handleClaimAction(c.id, "completed")}
                        disabled={actionBusyId === `claim-${c.id}` || c.status === "completed"}
                        className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => void handleClaimAction(c.id, "rejected")}
                        disabled={actionBusyId === `claim-${c.id}` || c.status === "rejected"}
                        className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => void handleReviewFlag(c.id, false)}
                        disabled={actionBusyId === `flag-${c.id}`}
                        className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                      >
                        Unflag
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center gap-1">
                      <p className="text-xs text-muted-foreground">Locked (AI final)</p>
                      <button
                        onClick={() => void handleReviewFlag(c.id, true)}
                        disabled={actionBusyId === `flag-${c.id}`}
                        className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                      >
                        Flag Review
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Showing {pagedClaims.length} of {filteredClaims.length} claims
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setClaimsPage((p) => Math.max(1, p - 1))}
                  disabled={claimsPage === 1}
                  className="rounded border border-border px-2 py-1 disabled:opacity-50"
                >
                  Prev
                </button>
                <span>
                  Page {claimsPage} / {totalClaimsPages}
                </span>
                <button
                  onClick={() => setClaimsPage((p) => Math.min(totalClaimsPages, p + 1))}
                  disabled={claimsPage === totalClaimsPages}
                  className="rounded border border-border px-2 py-1 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection>
          <div className="glass-card-premium rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="font-display font-semibold">Payout Transactions</h3>
              <button
                onClick={exportPayoutsCsv}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
              >
                <Download className="h-4 w-4" />
                Export Payout CSV
              </button>
            </div>
            <div className="grid md:grid-cols-6 gap-3 mb-4">
              <input
                value={payoutQuery}
                onChange={(e) => setPayoutQuery(e.target.value)}
                placeholder="Search user/ref/claim"
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 md:col-span-2"
              />
              <select
                value={payoutStatusFilter}
                onChange={(e) => setPayoutStatusFilter(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">All Status</option>
                {payoutStatusOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select
                value={payoutGatewayFilter}
                onChange={(e) => setPayoutGatewayFilter(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">All Gateways</option>
                {payoutGatewayOptions.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <input
                type="date"
                value={payoutFromDate}
                onChange={(e) => setPayoutFromDate(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="date"
                value={payoutToDate}
                onChange={(e) => setPayoutToDate(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="mb-4 flex items-center gap-2 text-xs">
              <button
                onClick={() => setPayoutFailedOnly((v) => !v)}
                className={`rounded border px-2 py-1 ${payoutFailedOnly ? "border-destructive text-destructive" : "border-border text-muted-foreground"}`}
              >
                {payoutFailedOnly ? "Showing Failed Only" : "Show Failed Only"}
              </button>
              <button
                onClick={() => {
                  setPayoutQuery("");
                  setPayoutStatusFilter("all");
                  setPayoutGatewayFilter("all");
                  setPayoutFailedOnly(false);
                  setPayoutFromDate("");
                  setPayoutToDate("");
                  setPayoutSort("settledAt");
                  setPayoutSortDir("desc");
                }}
                className="rounded border border-border px-2 py-1 text-muted-foreground"
              >
                Clear Filters
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="rounded-lg border border-border p-3 bg-card/60">
                <p className="text-[11px] text-muted-foreground">Captured</p>
                <p className="font-semibold">{payoutKpis.captured}</p>
              </div>
              <div className="rounded-lg border border-border p-3 bg-card/60">
                <p className="text-[11px] text-muted-foreground">Processing</p>
                <p className="font-semibold">{payoutKpis.processing}</p>
              </div>
              <div className="rounded-lg border border-border p-3 bg-card/60">
                <p className="text-[11px] text-muted-foreground">Failed</p>
                <p className="font-semibold">{payoutKpis.failed}</p>
              </div>
              <div className="rounded-lg border border-border p-3 bg-card/60">
                <p className="text-[11px] text-muted-foreground">Success Rate</p>
                <p className="font-semibold">{payoutKpis.successRate}%</p>
              </div>
            </div>
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-sm min-w-[920px]">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border/50">
                    <th className="py-2 pr-3">User</th>
                    <th className="py-2 pr-3">
                      <button type="button" onClick={() => togglePayoutSort("amount")} className="hover:text-foreground">
                        Amount{sortIndicator(payoutSort === "amount", payoutSortDir)}
                      </button>
                    </th>
                    <th className="py-2 pr-3">Gateway</th>
                    <th className="py-2 pr-3">Reference</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">
                      <button type="button" onClick={() => togglePayoutSort("settledAt")} className="hover:text-foreground">
                        Settled At{sortIndicator(payoutSort === "settledAt", payoutSortDir)}
                      </button>
                    </th>
                    <th className="py-2 pr-3">
                      <button type="button" onClick={() => togglePayoutSort("attempts")} className="hover:text-foreground">
                        Attempts{sortIndicator(payoutSort === "attempts", payoutSortDir)}
                      </button>
                    </th>
                    <th className="py-2 pr-3">Failure Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedPayouts.map((p) => (
                    <tr key={`payout-${p.claimId}-${p.reference}`} className="border-b border-border/30">
                      <td className="py-2 pr-3">{p.user}</td>
                      <td className="py-2 pr-3">₹{p.amount}</td>
                      <td className="py-2 pr-3 uppercase">{p.gateway}</td>
                      <td className="py-2 pr-3 text-xs">{p.reference}</td>
                      <td className="py-2 pr-3">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            p.status === "captured"
                              ? "bg-success/15 text-success"
                              : p.status === "processing"
                                ? "bg-accent/15 text-accent"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-xs">{p.settledAt ? new Date(p.settledAt).toLocaleString() : "-"}</td>
                      <td className="py-2 pr-3 text-xs">{p.attempts}</td>
                      <td className="py-2 pr-3 text-xs text-destructive">{p.failureReason || "-"}</td>
                    </tr>
                  ))}
                  {pagedPayouts.length === 0 && (
                    <tr>
                      <td className="py-6 text-center text-muted-foreground" colSpan={8}>
                        No payout transactions available yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="md:hidden mt-4 space-y-3">
              {pagedPayouts.map((p) => (
                <div key={`m-payout-${p.claimId}-${p.reference}`} className="rounded-lg border border-border p-3 bg-card/60">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{p.user}</p>
                    <span className="text-xs uppercase text-muted-foreground">{p.gateway}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Amount: ₹{p.amount}</p>
                  <p className="text-xs text-muted-foreground mt-1">Ref: {p.reference}</p>
                  <p className="text-xs text-muted-foreground mt-1">Status: {p.status}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Settled: {p.settledAt ? new Date(p.settledAt).toLocaleString() : "-"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Attempts: {p.attempts}</p>
                  {p.failureReason && <p className="text-xs text-destructive mt-1">Error: {p.failureReason}</p>}
                </div>
              ))}
              {pagedPayouts.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No payout transactions available yet.
                </p>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Showing {pagedPayouts.length} of {filteredPayouts.length} payouts
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPayoutPage((p) => Math.max(1, p - 1))}
                  disabled={payoutPage === 1}
                  className="rounded border border-border px-2 py-1 disabled:opacity-50"
                >
                  Prev
                </button>
                <span>
                  Page {payoutPage} / {totalPayoutPages}
                </span>
                <button
                  onClick={() => setPayoutPage((p) => Math.min(totalPayoutPages, p + 1))}
                  disabled={payoutPage === totalPayoutPages}
                  className="rounded border border-border px-2 py-1 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </AnimatedSection>

        <div className="grid md:grid-cols-5 gap-4">
          {[
            { label: "Approved Claims", value: operationsKpis.approvedClaims, icon: FileText },
            { label: "Pending Claims", value: operationsKpis.pendingClaims, icon: AlertTriangle },
            { label: "Flagged Claims", value: operationsKpis.flaggedClaims, icon: AlertTriangle },
            { label: "Risky Users", value: operationsKpis.riskyUsers, icon: AlertTriangle },
            { label: "Suspicious Users", value: operationsKpis.suspiciousUsers, icon: ShieldCheck },
            { label: "Avg Fraud Score", value: operationsKpis.averageFraudScore, icon: ShieldCheck },
          ].map((k) => (
            <AnimatedSection key={k.label}>
              <div className="glass-card-premium rounded-xl p-4">
                <k.icon className="h-5 w-5 text-primary mb-2" />
                <div className="font-display text-xl font-bold">
                  <CountUp value={k.value} />
                </div>
                <div className="text-xs text-muted-foreground">{k.label}</div>
              </div>
            </AnimatedSection>
          ))}
        </div>

        <AnimatedSection>
          <div className="glass-card-premium rounded-xl p-5">
            <h3 className="font-display font-semibold mb-4">Policy Performance</h3>
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border/50">
                    <th className="py-2 pr-3">Plan</th>
                    <th className="py-2 pr-3">Premium</th>
                    <th className="py-2 pr-3">Coverage</th>
                    <th className="py-2 pr-3">Active Users</th>
                  </tr>
                </thead>
                <tbody>
                  {data.policiesTable.map((p) => (
                    <tr key={p.plan} className="border-b border-border/30">
                      <td className="py-2 pr-3 capitalize">{p.plan}</td>
                      <td className="py-2 pr-3">₹{p.premium}</td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{p.coverage}</td>
                      <td className="py-2 pr-3">{p.activeUsers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden mt-4 space-y-3">
              {data.policiesTable.map((p) => (
                <div key={`mp-${p.plan}`} className="rounded-lg border border-border p-3 bg-card/60">
                  <div className="flex items-center justify-between">
                    <p className="font-medium capitalize">{p.plan}</p>
                    <span className="text-xs text-muted-foreground">Users: {p.activeUsers}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Premium: ₹{p.premium}</p>
                  <p className="text-xs text-muted-foreground mt-1">{p.coverage}</p>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
