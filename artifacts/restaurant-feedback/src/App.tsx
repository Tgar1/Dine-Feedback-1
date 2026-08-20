import QRGenerator from './pages/qr-generator';
import { useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import FeedbackForm from '@/pages/feedback';
import ThankYou from '@/pages/thank-you';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();
type DashboardAnalysis = {
  submission_id: string;
  sentiment: "positive" | "neutral" | "negative";
  severity: number | null;
  issue_summary: string | null;
  recommended_action: string | null;
  confidence: number | null;
  model: string | null;
};

type DashboardFeedback = {
  id: string;
  overall_rating: number;
  pain_point: string | null;
  positive_note: string | null;
  source: string | null;
  created_at: string;
  meal_period: string | null;
  order_type: string | null;
  diagnosis: FeedbackDiagnosis | null;
  ai_analysis: DashboardAnalysis | null;
};
type FeedbackDiagnosis = {
  enjoyed_most: string | null;
  improvement_suggestion: string | null;
  primary_issue: string | null;
  secondary_issue: string | null;
  root_cause: string | null;
  waiting_time: string | null;
  additional_comments: string | null;
  customer_sentiment: string | null;
  would_return: boolean | null;
};

type DashboardData = {
  restaurant: {
    id: string;
    identifier: string;
  };
  summary: {
    totalFeedback: number;
    averageRating: number;
  };
  ratingDistribution: Record<string, number>;
  painPointDistribution: {
    food: number;
    service: number;
    waiting: number;
    cleanliness: number;
    ambience: number;
    value: number;
  };
  diagnosisInsights: {
    primaryIssues: Array<{ label: string; count: number }>;
    rootCauses: Array<{ label: string; count: number }>;
  };
  recentFeedback: DashboardFeedback[];
};

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={FeedbackForm} />
        <Route path="/thank-you" component={ThankYou} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/qr" component={QRGenerator} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}
function Dashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dashboardLocation = new URLSearchParams(window.location.search)
    .get("location")
    ?.trim();

  useEffect(() => {
    if (!dashboardLocation) {
      setError("Dashboard link is missing its restaurant location.");
      return;
    }

    fetch(`/api/dashboard?location=${encodeURIComponent(dashboardLocation)}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unable to load dashboard data.");
        }

        return response.json();
      })
      .then((data) => {
        console.log(
          "AI ANALYSIS JSON:",
          JSON.stringify(data.recentFeedback?.[0]?.ai_analysis, null, 2)
        );

        console.log(
          "FEEDBACK JSON:",
          JSON.stringify(data.recentFeedback?.[0], null, 2)
        );

        setDashboard(data);
      })
      .catch((err) => {
        console.error(err);
        setError("Unable to load dashboard data.");
      });
  }, [dashboardLocation]);

  if (error) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-800 to-orange-500">
            Dashboard error
          </h1>
          <p className="mt-2 text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <header className="border-b-4 border-purple-500 bg-gradient-to-r from-[#143B2E] to-[#1a5c47] text-white shadow-lg">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <p className="text-sm font-medium uppercase tracking-widest text-[#D4FF1A]">
              {dashboardLocation || 'Restaurant'}
            </p>
            <h1 className="mt-1 text-3xl font-bold">
              Feedback Dashboard
            </h1>
            <p className="mt-2 text-sm text-white/70">
              Loading customer feedback...
            </p>
          </div>
        </header>
      </div>
    );
  }

  const {
    summary,
    ratingDistribution,
    painPointDistribution,
    diagnosisInsights,
    recentFeedback,
  } = dashboard;
  console.log("DASHBOARD DATA:", dashboard);

  const ratingRows = [
    ["5 Stars", ratingDistribution["5"]],
    ["4 Stars", ratingDistribution["4"]],
    ["3 Stars", ratingDistribution["3"]],
    ["2 Stars", ratingDistribution["2"]],
    ["1 Star", ratingDistribution["1"]],
  ];

  const painPointRows = [
    ["Food", painPointDistribution.food],
    ["Service", painPointDistribution.service],
    ["Waiting", painPointDistribution.waiting],
    ["Cleanliness", painPointDistribution.cleanliness],
    ["Atmosphere", painPointDistribution.ambience],
    ["Value", painPointDistribution.value],
  ];
  const analyzedFeedback = recentFeedback.filter(
    (item) => item.ai_analysis !== null,
  );
  const sentimentCounts = {
    positive: analyzedFeedback.filter(
      (item) => item.ai_analysis?.sentiment === "positive",
    ).length,
    neutral: analyzedFeedback.filter(
      (item) => item.ai_analysis?.sentiment === "neutral",
    ).length,
    negative: analyzedFeedback.filter(
      (item) => item.ai_analysis?.sentiment === "negative",
    ).length,
  };

  const dominantSentiment =
    sentimentCounts.positive >= sentimentCounts.neutral &&
      sentimentCounts.positive >= sentimentCounts.negative
      ? "positive"
      : sentimentCounts.negative >= sentimentCounts.neutral
        ? "negative"
        : "neutral";

  const positiveFeedbackCount = analyzedFeedback.filter(
    (item) => item.ai_analysis?.sentiment === "positive",
  ).length;

  const needsAttentionCount = analyzedFeedback.filter(
    (item) =>
      item.ai_analysis?.sentiment === "negative" ||
      (item.ai_analysis?.severity ?? 0) >= 3,
  ).length;
  const topComplaints = analyzedFeedback
    .filter(
      (item) =>
        item.ai_analysis?.sentiment === "negative" ||
        (item.ai_analysis?.severity ?? 0) >= 3,
    )
    .map((item) => item.ai_analysis?.issue_summary)
    .filter((summary): summary is string => Boolean(summary));

  const topPositiveMentions = analyzedFeedback
    .filter((item) => item.ai_analysis?.sentiment === "positive")
    .map((item) => item.ai_analysis?.issue_summary)
    .filter((summary): summary is string => Boolean(summary));

  const recommendedActions = analyzedFeedback
    .map((item) => item.ai_analysis?.recommended_action)
    .filter((action): action is string => Boolean(action));

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 bg-[#143B2E] text-white">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <p className="text-sm font-medium uppercase tracking-widest text-[#D4FF1A]">
            Rodina
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Feedback Dashboard
          </h1>

          <p className="mt-2 text-sm text-white/70">
            Understand what your customers are saying and where to improve.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Feedback</p>
            <p className="mt-2 text-3xl font-bold text-[#143B2E]">
              {summary.totalFeedback}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Average Rating</p>
            <p className="mt-2 text-3xl font-bold text-[#143B2E]">
              {Number(summary.averageRating).toFixed(1)}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Positive Feedback</p>
            <p className="mt-2 text-3xl font-bold text-[#143B2E]">
              {positiveFeedbackCount}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Based on analyzed feedback
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="mt-2 text-3xl font-bold text-[#143B2E]">
              {needsAttentionCount}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Based on severity and sentiment
            </p>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#143B2E]">
              Rating Overview
            </h2>

            <div className="mt-5 space-y-4">
              {ratingRows.map(([label, count]) => (
                <div
                  key={String(label)}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-gray-600">
                    {label}
                  </span>

                  <span className="font-semibold text-[#143B2E]">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#143B2E]">
              What Customers Mention
            </h2>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {painPointRows.map(([label, count]) => (
                <div
                  key={String(label)}
                  className="rounded-xl bg-gray-50 p-4"
                >
                  <p className="text-sm text-gray-500">
                    {label}
                  </p>

                  <p className="mt-1 text-2xl font-bold text-[#143B2E]">
                    {count}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#143B2E]">
              What needs attention
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              The issue customers selected after identifying a concern.
            </p>
            <div className="mt-5 space-y-3">
              {diagnosisInsights.primaryIssues.length === 0 ? (
                <p className="text-sm text-gray-500">No diagnosis data yet.</p>
              ) : (
                diagnosisInsights.primaryIssues.slice(0, 6).map((issue) => (
                  <div key={issue.label} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                    <span className="capitalize text-sm text-gray-700">{issue.label.replace(/-/g, " ")}</span>
                    <span className="font-semibold text-[#143B2E]">{issue.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#143B2E]">
              Root causes
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Specific answers that explain why the experience fell short.
            </p>
            <div className="mt-5 space-y-3">
              {diagnosisInsights.rootCauses.length === 0 ? (
                <p className="text-sm text-gray-500">No root-cause data yet.</p>
              ) : (
                diagnosisInsights.rootCauses.slice(0, 6).map((cause) => (
                  <div key={cause.label} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                    <span className="capitalize text-sm text-gray-700">{cause.label.replace(/-/g, " ")}</span>
                    <span className="font-semibold text-[#143B2E]">{cause.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#143B2E]">
            Recent Feedback
          </h2>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-gray-500">
                <tr>
                  <th className="px-3 py-3 font-medium">Rating</th>
                  <th className="px-3 py-3 font-medium">Pain Point</th>
                  <th className="px-3 py-3 font-medium">Diagnosis</th>
                  <th className="px-3 py-3 font-medium">Comment</th>
                  <th className="px-3 py-3 font-medium">Source</th>
                </tr>
              </thead>

              <tbody>
                {recentFeedback.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-6 text-center text-gray-500"
                    >
                      No feedback yet.
                    </td>
                  </tr>
                ) : (
                  recentFeedback.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-100"
                    >
                      <td className="px-3 py-4 font-semibold">
                        {item.overall_rating} / 5
                      </td>

                      <td className="px-3 py-4 capitalize">
                        {item.pain_point || "—"}
                      </td>

                      <td className="px-3 py-4 capitalize">
                        {item.diagnosis?.root_cause?.replace(/-/g, " ") ||
                          item.diagnosis?.primary_issue?.replace(/-/g, " ") ||
                          "—"}
                      </td>

                      <td className="px-3 py-4">
                        {item.positive_note || "—"}
                      </td>

                      <td className="px-3 py-4">
                        <span className="rounded-full bg-[#D4FF1A] px-3 py-1 text-xs font-semibold text-[#143B2E]">
                          {String(item.source || "—").toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#143B2E]">
              Customer Sentiment
            </h2>

            <div className="mt-5 rounded-xl bg-gray-50 p-5">
              {analyzedFeedback.length === 0 ? (
                <p className="text-sm text-gray-500">
                  AI sentiment analysis will appear here once feedback has been analyzed.
                </p>
              ) : (
                <>
                  <p className="text-sm text-gray-500">
                    Current overall sentiment
                  </p>

                  <p className="mt-2 text-3xl font-bold capitalize text-[#143B2E]">
                    {dominantSentiment}
                  </p>

                  <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-lg bg-white p-3">
                      <p className="text-xs text-gray-500">Positive</p>
                      <p className="mt-1 text-xl font-bold text-[#143B2E]">
                        {sentimentCounts.positive}
                      </p>
                    </div>

                    <div className="rounded-lg bg-white p-3">
                      <p className="text-xs text-gray-500">Neutral</p>
                      <p className="mt-1 text-xl font-bold text-[#143B2E]">
                        {sentimentCounts.neutral}
                      </p>
                    </div>

                    <div className="rounded-lg bg-white p-3">
                      <p className="text-xs text-gray-500">Negative</p>
                      <p className="mt-1 text-xl font-bold text-[#143B2E]">
                        {sentimentCounts.negative}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#143B2E]">
              AI Insights
            </h2>

            <div className="mt-5 space-y-4">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-sm font-semibold text-[#143B2E]">
                  Top complaints
                </p>

                {topComplaints.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500">
                    No significant complaints identified.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2 text-sm text-gray-600">
                    {topComplaints.slice(0, 5).map((complaint, index) => (
                      <li key={`${complaint}-${index}`}>
                        • {complaint}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-sm font-semibold text-[#143B2E]">
                  Top positive mentions
                </p>

                {topPositiveMentions.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500">
                    No positive mentions identified yet.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2 text-sm text-gray-600">
                    {topPositiveMentions.slice(0, 5).map((mention, index) => (
                      <li key={`${mention}-${index}`}>
                        • {mention}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-sm font-semibold text-[#143B2E]">
                  Recommended actions
                </p>

                {recommendedActions.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500">
                    Recommended actions will appear here.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2 text-sm text-gray-600">
                    {recommendedActions.slice(0, 5).map((action, index) => (
                      <li key={`${action}-${index}`}>
                        • {action}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
