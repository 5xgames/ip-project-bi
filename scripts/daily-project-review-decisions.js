"use strict";

// Keep review selection independent of file I/O so queue reorderings can be
// tested without applying decisions to either published data or the queue.
function hasReviewBody(item) {
  return Boolean(item && String(item.reviewStatus || "").trim()
    && String(item.reviewReason || "").trim());
}

function matchesHeadline(candidate, decision) {
  const titleContains = typeof decision?.titleContains === "string"
    ? decision.titleContains.trim() : "";
  if (!titleContains || !String(candidate.title || "").includes(titleContains)) return false;
  return !decision.candidateUrl || decision.candidateUrl === candidate.url;
}

function uniqueMatchingDecision(candidate, decisions, index, label) {
  const matches = decisions.filter((decision) => matchesHeadline(candidate, decision));
  if (!matches.length) return undefined;
  if (matches.some((decision) => !hasReviewBody(decision))) {
    throw new Error(`News candidate ${index} has an incomplete matching ${label}`);
  }
  const outcomes = new Set(matches.map((decision) => JSON.stringify([
    decision.reviewStatus, decision.reviewReason, decision.reviewEvidenceUrl || "",
  ])));
  if (outcomes.size > 1) {
    throw new Error(`News candidate ${index} has ambiguous matching ${label}`);
  }
  return matches[0];
}

function validateIndexedDecisions(candidates, decisions) {
  for (const [index, candidate] of candidates.entries()) {
    const decision = decisions[index];
    if (!hasReviewBody(decision) || typeof decision?.titleContains !== "string"
      || !decision.titleContains.trim()) {
      throw new Error(`News candidate ${index} lacks an explicit dated review decision`);
    }
    if (!matchesHeadline(candidate, decision)) {
      throw new Error(`News candidate ${index} no longer matches the reviewed headline`);
    }
  }
  for (const [indexText, decision] of Object.entries(decisions)) {
    const index = Number(indexText);
    if (!Number.isInteger(index) || index < 0 || !candidates[index]
      || !matchesHeadline(candidates[index], decision)) {
      throw new Error(`News candidate ${indexText} no longer matches the reviewed headline`);
    }
  }
}

function resolveNewsReviews(candidates, review, today, { reconcileNews = false } = {}) {
  const decisions = review.newsDecisions || {};
  const supplements = review.newsSupplements || [];
  if (!reconcileNews) validateIndexedDecisions(candidates, decisions);

  return candidates.map((candidate, index) => {
    // Supplements are explicit corrections and intentionally take precedence
    // over both indexed decisions and an already-preserved review.
    const supplement = uniqueMatchingDecision(candidate, supplements, index, "supplement");
    const decision = supplement || (reconcileNews
      ? uniqueMatchingDecision(candidate, Object.values(decisions), index, "decision")
      : decisions[index]);
    if (!decision && reconcileNews && candidate.reviewedAt === today && hasReviewBody(candidate)) {
      return { ...candidate };
    }
    if (!hasReviewBody(decision)) {
      throw new Error(`News candidate ${index} lacks today's explicit review; reconcile cannot invent a decision`);
    }
    return {
      ...candidate,
      reviewStatus: decision.reviewStatus,
      reviewReason: decision.reviewReason,
      reviewEvidenceUrl: decision.reviewEvidenceUrl || "",
      reviewedAt: today,
    };
  });
}

function newsReviewIdentity(candidate) {
  if (typeof candidate?.url !== "string" || !candidate.url.trim()
    || typeof candidate?.title !== "string" || !candidate.title.trim()) return undefined;
  return JSON.stringify([candidate.url, candidate.title]);
}

function buildNewsReviewHistory(candidates) {
  const history = new Map();
  for (const candidate of candidates) {
    const identity = newsReviewIdentity(candidate);
    if (!identity || !String(candidate.reviewStatus || "").trim()) continue;
    history.set(identity, {
      reviewStatus: candidate.reviewStatus,
      reviewReason: candidate.reviewReason || "",
      reviewEvidenceUrl: candidate.reviewEvidenceUrl || "",
      reviewedAt: candidate.reviewedAt || "",
    });
  }
  return history;
}

function restoreNewsReview(candidate, history) {
  const identity = newsReviewIdentity(candidate);
  return { ...candidate, ...(identity ? history.get(identity) : undefined) };
}

module.exports = { resolveNewsReviews, newsReviewIdentity, buildNewsReviewHistory, restoreNewsReview };
