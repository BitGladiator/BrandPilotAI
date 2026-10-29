"""Routes for running and inspecting accuracy evaluations against labelled ground-truth data."""
from dataclasses import asdict
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, get_optional_user, require_role
from app.db.models import EvaluationRun, User
from app.db.session import get_db
from app.evaluation.evaluator import run_evaluation

router = APIRouter(prefix="/evaluation", tags=["Accuracy Evaluation"])


@router.get("/latest")
async def get_latest_evaluation(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Returns the latest persisted evaluation run or computes on-demand if none exists."""
    latest = db.query(EvaluationRun).order_by(EvaluationRun.created_at.desc()).first()
    if latest:
        return {
            "id": latest.id,
            "dataset_version": latest.dataset_version,
            "model_name": latest.model_name,
            "matching_policy": latest.matching_policy,
            "sample_count": latest.sample_count,
            "true_positives": latest.true_positives,
            "false_positives": latest.false_positives,
            "false_negatives": latest.false_negatives,
            "precision": latest.precision,
            "recall": latest.recall,
            "f1": latest.f1,
            "metrics_by_category": latest.metrics_by_category,
            "notes": latest.notes,
            "created_at": latest.created_at.isoformat(),
            # Provide baseline comparison
            "baseline": {
                "precision": 0.9231,
                "recall": 0.8571,
                "f1": 0.8889,
                "dataset_size": 10,
            },
        }

    # If none persisted yet, run evaluation and persist
    report = await run_evaluation(db=db)
    run_obj = EvaluationRun(
        dataset_version=report.dataset_version,
        model_name=report.model_name,
        matching_policy=report.matching_policy,
        sample_count=report.aggregate.sample_count,
        true_positives=report.aggregate.true_positives,
        false_positives=report.aggregate.false_positives,
        false_negatives=report.aggregate.false_negatives,
        precision=report.aggregate.precision,
        recall=report.aggregate.recall,
        f1=report.aggregate.f1,
        metrics_by_category={k: asdict(v) for k, v in report.by_category.items()},
        notes=report.notes,
    )
    db.add(run_obj)
    db.commit()
    db.refresh(run_obj)

    return {
        "id": run_obj.id,
        "dataset_version": run_obj.dataset_version,
        "model_name": run_obj.model_name,
        "matching_policy": run_obj.matching_policy,
        "sample_count": run_obj.sample_count,
        "true_positives": run_obj.true_positives,
        "false_positives": run_obj.false_positives,
        "false_negatives": run_obj.false_negatives,
        "precision": run_obj.precision,
        "recall": run_obj.recall,
        "f1": run_obj.f1,
        "metrics_by_category": run_obj.metrics_by_category,
        "notes": run_obj.notes,
        "created_at": run_obj.created_at.isoformat(),
        "baseline": {
            "precision": 0.9231,
            "recall": 0.8571,
            "f1": 0.8889,
            "dataset_size": 10,
        },
    }


@router.post("/run")
async def trigger_evaluation_run(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["reviewer", "admin"])),
):
    """Authorized reviewers/admins can trigger an evaluation run against labelled test cases."""
    report = await run_evaluation(db=db)
    run_obj = EvaluationRun(
        dataset_version=report.dataset_version,
        model_name=report.model_name,
        matching_policy=report.matching_policy,
        sample_count=report.aggregate.sample_count,
        true_positives=report.aggregate.true_positives,
        false_positives=report.aggregate.false_positives,
        false_negatives=report.aggregate.false_negatives,
        precision=report.aggregate.precision,
        recall=report.aggregate.recall,
        f1=report.aggregate.f1,
        metrics_by_category={k: asdict(v) for k, v in report.by_category.items()},
        notes=report.notes,
    )
    db.add(run_obj)
    db.commit()
    db.refresh(run_obj)

    return {
        "id": run_obj.id,
        "report": asdict(report),
        "baseline": {
            "precision": 0.9231,
            "recall": 0.8571,
            "f1": 0.8889,
            "dataset_size": 10,
        },
    }


@router.get("/history")
def get_evaluation_history(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    runs = db.query(EvaluationRun).order_by(EvaluationRun.created_at.desc()).limit(20).all()
    return [
        {
            "id": r.id,
            "dataset_version": r.dataset_version,
            "model_name": r.model_name,
            "sample_count": r.sample_count,
            "precision": r.precision,
            "recall": r.recall,
            "f1": r.f1,
            "created_at": r.created_at.isoformat(),
        }
        for r in runs
    ]
