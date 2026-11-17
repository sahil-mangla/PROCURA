import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple, Optional
from app.data.storage import local_store

CATEGORIES = [
    "IT_EQUIPMENT", "SOFTWARE", "OFFICE_FURNITURE",
    "OFFICE_SUPPLIES", "SERVICES", "TRAVEL", "MAINTENANCE", "OTHER"
]

PRIORITY_MAP = {
    "LOW": 0,
    "NORMAL": 1,
    "HIGH": 2,
    "URGENT": 3
}

FEATURE_COLUMNS = [
    "request_amount",
    "department_budget",
    "budget_remaining",
    "budget_utilization",
    "projected_utilization",
    "amount_to_budget_ratio",
    "amount_to_remaining_ratio",
    "is_budget_exceeded",
    "dept_avg_amount",
    "dept_approval_rate",
    "amount_to_dept_avg_ratio",
    "past_overruns_count",
    "vendor_order_count",
    "vendor_is_unfamiliar",
    "request_frequency",
    "is_unusual_frequency",
    "priority_score",
    "item_count",
] + [f"cat_{c.lower()}" for c in CATEGORIES]


def extract_features_from_dict(
    req: Dict[str, Any],
    stats_source: Optional[Any] = None
) -> Dict[str, float]:
    """
    Extracts numerical features from a request dictionary without target leakage.
    Uses stats_source (defaults to local_store) for department & vendor historical context.
    """
    store = stats_source or local_store

    amount = float(req.get("amount", 0.0))
    dept_id = int(req.get("departmentId") or req.get("department_id", 1))
    vendor_id = int(req.get("vendorId") or req.get("vendor_id", 1))
    budget_total = float(req.get("budgetTotal") or req.get("budget_total_at_submit", 1000000.0))
    budget_remaining = float(req.get("budgetRemaining") or req.get("budget_remaining_at_submit", 500000.0))
    category = str(req.get("category", "OTHER")).upper()
    priority = str(req.get("priority", "NORMAL")).upper()

    # Calculate item count
    items = req.get("items")
    if items and isinstance(items, list):
        item_count = len(items)
    else:
        item_count = int(req.get("itemCount") or req.get("item_count", 1))

    # Safe division helpers
    budget_total_safe = max(budget_total, 1.0)
    budget_remaining_safe = max(budget_remaining, 1.0)

    # Utilization ratios
    budget_utilization = max(0.0, (budget_total - budget_remaining) / budget_total_safe)
    new_remaining = budget_remaining - amount
    projected_utilization = min(2.0, max(0.0, (budget_total - new_remaining) / budget_total_safe))

    amount_to_budget_ratio = amount / budget_total_safe
    amount_to_remaining_ratio = amount / budget_remaining_safe
    is_budget_exceeded = 1.0 if amount > budget_remaining else 0.0

    # Historical department context
    dept_stats = store.get_department_stats(dept_id)
    dept_avg_amount = dept_stats.get("avg_amount", 50000.0)
    dept_avg_safe = max(dept_avg_amount, 1000.0)
    dept_approval_rate = dept_stats.get("approval_rate", 0.75)
    amount_to_dept_avg_ratio = min(10.0, amount / dept_avg_safe)
    past_overruns_count = float(dept_stats.get("past_overruns", 0))

    # Historical vendor context
    vendor_stats = store.get_vendor_stats(vendor_id)
    vendor_order_count = float(vendor_stats.get("total_orders", 0))
    vendor_is_unfamiliar = 1.0 if vendor_stats.get("is_unfamiliar", True) else 0.0

    # Request frequency context
    freq_stats = store.get_request_frequency(dept_id, vendor_id)
    request_frequency = float(freq_stats.get("vendor_request_count", 0))
    is_unusual_frequency = 1.0 if freq_stats.get("is_unusual_frequency", False) else 0.0

    priority_score = float(PRIORITY_MAP.get(priority, 1))

    features: Dict[str, float] = {
        "request_amount": amount,
        "department_budget": budget_total,
        "budget_remaining": budget_remaining,
        "budget_utilization": budget_utilization,
        "projected_utilization": projected_utilization,
        "amount_to_budget_ratio": amount_to_budget_ratio,
        "amount_to_remaining_ratio": amount_to_remaining_ratio,
        "is_budget_exceeded": is_budget_exceeded,
        "dept_avg_amount": dept_avg_amount,
        "dept_approval_rate": dept_approval_rate,
        "amount_to_dept_avg_ratio": amount_to_dept_avg_ratio,
        "past_overruns_count": past_overruns_count,
        "vendor_order_count": vendor_order_count,
        "vendor_is_unfamiliar": vendor_is_unfamiliar,
        "request_frequency": request_frequency,
        "is_unusual_frequency": is_unusual_frequency,
        "priority_score": priority_score,
        "item_count": float(item_count),
    }

    # One-hot encode category
    for cat in CATEGORIES:
        features[f"cat_{cat.lower()}"] = 1.0 if category == cat else 0.0

    return features


def build_training_features(data_rows: List[Dict[str, Any]]) -> Tuple[pd.DataFrame, np.ndarray]:
    """
    Constructs feature matrix X and label vector y from raw historical/synthetic rows.
    Outcome 'APPROVED' -> 1, 'REJECTED' -> 0.
    """
    feature_records = []
    labels = []

    for row in data_rows:
        outcome = str(row.get("outcome", "")).upper()
        if outcome not in ["APPROVED", "REJECTED"]:
            continue

        feat = extract_features_from_dict(row)
        feature_records.append(feat)
        labels.append(1 if outcome == "APPROVED" else 0)

    X = pd.DataFrame(feature_records)[FEATURE_COLUMNS]
    y = np.array(labels, dtype=int)
    return X, y

