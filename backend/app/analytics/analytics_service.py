"""Recurring-issues and editorial governance analytics service."""
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.models import (
    AuditEvent,
    Draft,
    DraftFinding,
    DraftRevision,
    SuggestionDecision,
    User,
)


def get_recurring_issues_analytics(
    db: Session,
    user: Optional[User] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    category_filter: Optional[str] = None,
) -> dict:
    """Computes comprehensive recurring-issues metrics from real persisted events."""
    # Base query for findings
    query = (
        db.query(DraftFinding, DraftRevision.draft_id)
        .join(DraftRevision, DraftFinding.revision_id == DraftRevision.id)
        .join(Draft, DraftRevision.draft_id == Draft.id)
    )

    # Data isolation: creator sees only findings from their drafts; reviewers/admins see all
    if user and user.role == "creator":
        query = query.filter(Draft.creator_id == user.id)

    if date_from:
        query = query.filter(DraftFinding.created_at >= date_from)
    if date_to:
        query = query.filter(DraftFinding.created_at <= date_to)
    if category_filter:
        query = query.filter(DraftFinding.category.ilike(f"%{category_filter}%"))

    findings_records = query.all()

    # Base query for suggestion decisions
    dec_query = (
        db.query(SuggestionDecision, DraftRevision.draft_id)
        .join(DraftRevision, SuggestionDecision.revision_id == DraftRevision.id)
        .join(Draft, DraftRevision.draft_id == Draft.id)
    )
    if user and user.role == "creator":
        dec_query = dec_query.filter(Draft.creator_id == user.id)
    if date_from:
        dec_query = dec_query.filter(SuggestionDecision.created_at >= date_from)
    if date_to:
        dec_query = dec_query.filter(SuggestionDecision.created_at <= date_to)

    decisions_records = dec_query.all()

    # Rule aggregations
    # rule_id -> {triggered_count, unique_drafts, category, descriptions}
    rule_stats = defaultdict(lambda: {
        "rule_id": "",
        "category": "Other",
        "triggered_count": 0,
        "unique_drafts": set(),
        "accepted_count": 0,
        "dismissed_count": 0,
        "overridden_count": 0,
        "sample_excerpt": "",
    })

    category_counts = defaultdict(int)
    severity_counts = defaultdict(int)

    for finding, draft_id in findings_records:
        r_id = finding.rule_id or finding.category
        st = rule_stats[r_id]
        st["rule_id"] = r_id
        st["category"] = finding.category
        st["triggered_count"] += 1
        st["unique_drafts"].add(draft_id)
        if not st["sample_excerpt"]:
            st["sample_excerpt"] = finding.excerpt

        category_counts[finding.category] += 1
        severity_counts[finding.severity] += 1

    for dec, draft_id in decisions_records:
        r_id = dec.rule_id or "UNKNOWN"
        st = rule_stats[r_id]
        if dec.action == "accept":
            st["accepted_count"] += 1
        elif dec.action == "dismiss":
            st["dismissed_count"] += 1
        elif dec.action == "override":
            st["overridden_count"] += 1

    # Format rules list with friction analysis
    rules_list = []
    for r_id, data in rule_stats.items():
        trig = data["triggered_count"]
        dism = data["dismissed_count"]
        acc = data["accepted_count"]
        total_dec = dism + acc + data["overridden_count"]

        dismiss_rate = round(dism / total_dec, 4) if total_dec > 0 else 0.0
        accept_rate = round(acc / total_dec, 4) if total_dec > 0 else 0.0

        # High friction warning: if dismissed frequently (>= 35% of decisions when total_dec >= 2)
        friction_flag = False
        friction_note = None
        if total_dec >= 2 and dismiss_rate >= 0.35:
            friction_flag = True
            friction_note = (
                f"Rule '{r_id}' is frequently dismissed ({round(dismiss_rate * 100)}% of decisions). "
                "This indicates potential friction or a brand guideline that may need editorial clarification."
            )

        rules_list.append({
            "rule_id": r_id,
            "category": data["category"],
            "triggered_count": trig,
            "unique_drafts_affected": len(data["unique_drafts"]),
            "accepted_count": acc,
            "dismissed_count": dism,
            "overridden_count": data["overridden_count"],
            "accept_rate": accept_rate,
            "dismiss_rate": dismiss_rate,
            "sample_excerpt": data["sample_excerpt"],
            "has_friction_warning": friction_flag,
            "friction_note": friction_note,
        })

    # Sort rules
    most_triggered = sorted(rules_list, key=lambda x: x["triggered_count"], reverse=True)
    most_dismissed = sorted(rules_list, key=lambda x: x["dismissed_count"], reverse=True)
    most_accepted = sorted(rules_list, key=lambda x: x["accepted_count"], reverse=True)

    # Time series trends (past 7 days by default)
    timeline_counts = defaultdict(lambda: {"triggered": 0, "accepted": 0, "dismissed": 0})
    for finding, _ in findings_records:
        day_str = finding.created_at.strftime("%Y-%m-%d")
        timeline_counts[day_str]["triggered"] += 1
    for dec, _ in decisions_records:
        day_str = dec.created_at.strftime("%Y-%m-%d")
        if dec.action == "accept":
            timeline_counts[day_str]["accepted"] += 1
        elif dec.action == "dismiss":
            timeline_counts[day_str]["dismissed"] += 1

    sorted_timeline = [
        {"date": day, **counts}
        for day, counts in sorted(timeline_counts.items(), key=lambda x: x[0])
    ]

    total_findings = len(findings_records)
    total_decisions = len(decisions_records)
    unique_drafts_count = len({d_id for _, d_id in findings_records})

    return {
        "summary": {
            "total_findings_recorded": total_findings,
            "total_decisions_recorded": total_decisions,
            "unique_drafts_analyzed": unique_drafts_count,
            "unique_rules_triggered": len(rule_stats),
            "is_empty": total_findings == 0,
        },
        "most_triggered_rules": most_triggered[:10],
        "most_dismissed_rules": [r for r in most_dismissed if r["dismissed_count"] > 0][:10],
        "most_accepted_suggestions": [r for r in most_accepted if r["accepted_count"] > 0][:10],
        "category_distribution": dict(category_counts),
        "severity_distribution": dict(severity_counts),
        "activity_timeline": sorted_timeline,
    }
