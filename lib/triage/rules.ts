// Keyword-based triage: instant and free. Used for new reports and as the
// fallback when IBM Bob is unavailable.
import type { IssueCategory, PriorityLevel, SeverityLevel, TriageInput, TriageResult } from "../../types/issues";

const CATEGORY_KEYWORDS: [IssueCategory, RegExp][] = [
  ["Security", /\b(xss|csrf|sql injection|injection|vulnerab\w*|exploit|leak\w*|exposed|breach|unauthori[sz]ed access|privilege|secret|api key)\b/],
  ["Payment", /\b(pay|payment|paid|balance|charge[ds]?|refund|transaction|qris|invoice|wallet|billing|deduct\w*|virtual account)\b/],
  ["Authentication", /\b(log ?in|logout|sign ?in|sign ?up|password|jwt|session|token|auth\w*|otp|credential|email match\w*)\b/],
  ["Checkout", /\b(checkout|cart|order|stock|inventory|purchase[ds]?|buy|out of stock)\b/],
  ["Performance", /\b(slow|timeout|timed out|latency|memory|freez\w*|hang\w*|lag\w*|performance|cpu)\b/],
  ["Data", /\b(database|data loss|duplicate\w*|corrupt\w*|missing data|sync\w*|migration|record)\b/],
  ["Integration", /\b(api|webhook|third[- ]party|integration|github|endpoint|callback)\b/],
  ["UI", /\b(button|layout|css|display\w*|render\w*|ui|style|responsive|dark mode|typo|alignment|modal|page|footer|header)\b/],
];

const CRITICAL = /\b(data loss|lost data|corrupt\w*|security|vulnerab\w*|breach|leak\w*|double (charge|deduction|payment)|negative stock|becomes negative|all users|production down|outage)\b/;
// Money moved more than once ("deducts the balance twice", "charged twice").
const DUPLICATE_MONEY = /\b(charg|deduct|debit|pa(y|id)|transaction)\w*[^.\n]{0,40}\b(twice|two times|double)\b/;
const HIGH = /\b(cannot|can't|can not|unable|fail\w*|error|500|crash\w*|broken|block\w*|not work\w*|does not|doesn't|401|403|exception)\b/;
const LOW = /\b(typo|cosmetic|alignment|spacing|colou?r|font|tooltip|minor)\b/;

const PRIORITY_FOR: Record<SeverityLevel, PriorityLevel> = { critical: "urgent", high: "high", medium: "medium", low: "low" };

export function triageWithRules(input: TriageInput): TriageResult {
  const text = [input.title, input.description, input.expectedBehavior, input.actualBehavior, input.errorLog]
    .filter(Boolean).join("\n").toLowerCase();
  // The title states the problem most directly; fall back to the full report.
  const title = input.title.toLowerCase();
  const matched = CATEGORY_KEYWORDS.find(([, pattern]) => pattern.test(title)) ??
    CATEGORY_KEYWORDS.find(([, pattern]) => pattern.test(text));
  const category: IssueCategory = matched?.[0] ?? "Other";
  let severity: SeverityLevel = "medium";
  if (category === "Security" || CRITICAL.test(text) || DUPLICATE_MONEY.test(text)) severity = "critical";
  else if (HIGH.test(text) || ["Payment", "Checkout", "Authentication"].includes(category)) severity = "high";
  else if (LOW.test(text) || category === "UI") severity = "low";
  const keyword = matched ? (title.match(matched[1]) ?? text.match(matched[1]))?.[0] : undefined;
  return {
    category, severity, priority: PRIORITY_FOR[severity], source: "rules",
    rationale: keyword
      ? `Keyword "${keyword}" suggests ${category}; severity set to ${severity}.`
      : `No strong keywords found; defaulted to ${severity}.`,
  };
}
