"""Precision, Recall, and F1 evaluation runner against ground-truth labelled datasets."""
import json
import logging
import os
import re
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from app.config import Settings, get_settings
from app.schemas.review import ApprovedFact, ApprovedTerm, Guideline, ReviewRequest
from app.services.review_service import review_draft

logger = logging.getLogger("brandpilot.evaluation")


@dataclass
class MetricScores:
    true_positives: int
    false_positives: int
    false_negatives: int
    precision: float
    recall: float
    f1: float
    sample_count: int


@dataclass
class EvaluationReport:
    dataset_version: str
    model_name: str
    matching_policy: str
    timestamp: str
    aggregate: MetricScores
    by_category: dict[str, MetricScores]
    case_results: list[dict]
    notes: Optional[str] = None


def _normalize_text(s: str) -> str:
    """Normalize string for robust span matching."""
    s = s.lower().strip()
    # Replace non-alphanumeric with spaces, collapse spaces
    s = re.sub(r"[^\w\s]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def calculate_metrics(tp: int, fp: int, fn: int, total_samples: int = 0) -> MetricScores:
    """Calculates Precision, Recall, and F1 with explicit zero-denominator handling.

    Conventions:
    - If TP + FP == 0: Precision = 1.0 if TP + FN == 0 (no issues expected, none predicted) else 0.0.
    - If TP + FN == 0: Recall = 1.0 (no ground truth issues existed).
    - If Precision + Recall == 0: F1 = 0.0.
    """
    if tp + fp == 0:
        precision = 1.0 if (tp + fn == 0) else 0.0
    else:
        precision = tp / (tp + fp)

    if tp + fn == 0:
        recall = 1.0
    else:
        recall = tp / (tp + fn)

    if precision + recall == 0.0:
        f1 = 0.0
    else:
        f1 = (2.0 * precision * recall) / (precision + recall)

    return MetricScores(
        true_positives=tp,
        false_positives=fp,
        false_negatives=fn,
        precision=round(precision, 4),
        recall=round(recall, 4),
        f1=round(f1, 4),
        sample_count=total_samples,
    )


def match_findings_to_expected(
    predicted_findings: list[dict],
    expected_issues: list[dict],
) -> tuple[int, int, int]:
    """Matches predicted findings to expected ground-truth issues using category and normalized term overlap.

    Guarantees:
    - An expected issue is matched at most once.
    - A predicted finding matches at most one expected issue.
    - Duplicate predictions are not double-counted as true positives.
    """
    tp = 0
    matched_expected_indices = set()
    matched_pred_indices = set()

    for p_idx, pred in enumerate(predicted_findings):
        p_cat = str(pred.get("category", "")).strip().lower()
        p_norm = _normalize_text(str(pred.get("excerpt", "")))

        best_e_idx = None
        for e_idx, exp in enumerate(expected_issues):
            if e_idx in matched_expected_indices:
                continue

            e_cat = str(exp.get("category", "")).strip().lower()
            if p_cat != e_cat:
                continue

            e_norm = _normalize_text(str(exp.get("term", "")))
            # Match condition: exact match, substring containment, or token overlap
            if p_norm == e_norm or p_norm in e_norm or e_norm in p_norm:
                best_e_idx = e_idx
                break
            
            # Token overlap check
            p_tokens = set(p_norm.split())
            e_tokens = set(e_norm.split())
            if p_tokens and e_tokens and (p_tokens & e_tokens):
                best_e_idx = e_idx
                break

        if best_e_idx is not None:
            tp += 1
            matched_expected_indices.add(best_e_idx)
            matched_pred_indices.add(p_idx)

    fp = len(predicted_findings) - len(matched_pred_indices)
    fn = len(expected_issues) - len(matched_expected_indices)
    return tp, fp, fn


def load_evaluation_dataset() -> dict:
    dataset_path = Path(__file__).parent.parent / "data" / "evaluation_dataset.json"
    with open(dataset_path, "r", encoding="utf-8") as f:
        return json.load(f)


async def run_evaluation(
    settings: Optional[Settings] = None,
    dataset: Optional[dict] = None,
    db: Optional[Any] = None,
) -> EvaluationReport:
    """Executes the review pipeline over the ground-truth evaluation dataset and computes metrics."""
    if settings is None:
        settings = get_settings()
    if dataset is None:
        dataset = load_evaluation_dataset()

    version = dataset.get("version", "1.0.0")
    test_cases = dataset.get("test_cases", [])
    guidelines = [Guideline(**g) for g in dataset.get("guidelines_reference", [])]
    terms = [ApprovedTerm(**t) for t in dataset.get("approved_terms", [])]
    facts = [ApprovedFact(**f) for f in dataset.get("approved_facts", [])]

    total_tp = 0
    total_fp = 0
    total_fn = 0

    category_counts: dict[str, dict[str, int]] = {
        "Terminology": {"tp": 0, "fp": 0, "fn": 0, "samples": 0},
        "Tone": {"tp": 0, "fp": 0, "fn": 0, "samples": 0},
        "Claims": {"tp": 0, "fp": 0, "fn": 0, "samples": 0},
        "Accessibility": {"tp": 0, "fp": 0, "fn": 0, "samples": 0},
    }

    case_results = []

    for tc in test_cases:
        draft_text = tc["draft_text"]
        expected = tc.get("expected_issues", [])

        req = ReviewRequest(
            draft_text=draft_text,
            brand_guidelines=guidelines,
            approved_terms=terms,
            approved_facts=facts,
            use_indexed_guidelines=False,
        )

        res = await review_draft(req, settings, db=db)
        predicted = [f.model_dump() for f in res.findings]

        c_tp, c_fp, c_fn = match_findings_to_expected(predicted, expected)
        total_tp += c_tp
        total_fp += c_fp
        total_fn += c_fn

        # Per category tracking
        for cat in category_counts:
            pred_cat = [p for p in predicted if p["category"].lower() == cat.lower()]
            exp_cat = [e for e in expected if e["category"].lower() == cat.lower()]
            if pred_cat or exp_cat:
                category_counts[cat]["samples"] += 1
                cat_tp, cat_fp, cat_fn = match_findings_to_expected(pred_cat, exp_cat)
                category_counts[cat]["tp"] += cat_tp
                category_counts[cat]["fp"] += cat_fp
                category_counts[cat]["fn"] += cat_fn

        case_results.append({
            "test_case_id": tc["id"],
            "name": tc["name"],
            "expected_count": len(expected),
            "predicted_count": len(predicted),
            "tp": c_tp,
            "fp": c_fp,
            "fn": c_fn,
            "predicted_findings": predicted,
        })

    aggregate = calculate_metrics(total_tp, total_fp, total_fn, len(test_cases))

    by_category = {}
    for cat, counts in category_counts.items():
        by_category[cat] = calculate_metrics(counts["tp"], counts["fp"], counts["fn"], counts["samples"])

    report = EvaluationReport(
        dataset_version=version,
        model_name=settings.ai_model if settings.ai_enabled else "heuristic_rules_only",
        matching_policy="category_and_normalized_span_overlap",
        timestamp=datetime.now(timezone.utc).isoformat(),
        aggregate=aggregate,
        by_category=by_category,
        case_results=case_results,
        notes="Evaluated with ground-truth test suite including positive cases, edge cases, and negative controls.",
    )
    return report
