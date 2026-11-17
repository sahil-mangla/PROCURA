import os
import random
import csv
from datetime import datetime, timedelta
from typing import List, Dict, Any
from app.data.storage import local_store
from app.config import settings

CATEGORIES = [
    "IT_EQUIPMENT", "SOFTWARE", "OFFICE_FURNITURE",
    "OFFICE_SUPPLIES", "SERVICES", "TRAVEL", "MAINTENANCE"
]

DEPARTMENTS = [
    {"id": 1, "name": "Engineering", "budget": 1000000.00},
    {"id": 2, "name": "Marketing", "budget": 500000.00},
    {"id": 3, "name": "Operations", "budget": 750000.00}
]

VENDORS = [
    {"id": 1, "name": "TechSupply Solutions", "established": True},
    {"id": 2, "name": "CloudScale Infrastructure", "established": True},
    {"id": 3, "name": "OfficePrime Essentials", "established": False},
    {"id": 4, "name": "DevTools Inc", "established": True},
    {"id": 5, "name": "Global Office Mart", "established": True},
    {"id": 6, "name": "FastTrack Logistics", "established": False},
    {"id": 7, "name": "Apex IT Consulting", "established": True},
    {"id": 8, "name": "Novelty Tech Store", "established": False}
]

TITLES_BY_CATEGORY = {
    "IT_EQUIPMENT": [
        ("Developer Laptop 32GB RAM", 60000.0, 120000.0),
        ("External 4K Monitor", 25000.0, 50000.0),
        ("Mechanical Keyboards & Mice Bundle", 8000.0, 24000.0),
        ("Server Rack UPS Battery Backup", 45000.0, 90000.0),
        ("High-End Workstation for AI Dev", 150000.0, 300000.0),
        ("Wireless Noise-Cancelling Headsets", 12000.0, 36000.0)
    ],
    "SOFTWARE": [
        ("Cloud IDE & Copilot Team License", 30000.0, 90000.0),
        ("Project Management Enterprise Tier", 25000.0, 75000.0),
        ("Security Audit & Vulnerability Scanner", 80000.0, 160000.0),
        ("Analytics Dashboard Annual Subscription", 40000.0, 80000.0)
    ],
    "OFFICE_FURNITURE": [
        ("Ergonomic Mesh Task Chairs", 15000.0, 60000.0),
        ("Height-Adjustable Standing Desk", 20000.0, 80000.0),
        ("Conference Room Acoustic Panels", 35000.0, 70000.0),
        ("Executive Leather Lounge Recliners", 120000.0, 250000.0)
    ],
    "OFFICE_SUPPLIES": [
        ("Quarterly Printer Paper & Ink Cartridges", 5000.0, 15000.0),
        ("Stationery & Whiteboard Supplies", 4000.0, 12000.0),
        ("Facility Cleaning & Sanitization Kit", 6000.0, 18000.0)
    ],
    "SERVICES": [
        ("Cloud Infrastructure Migration Support", 50000.0, 120000.0),
        ("Quarterly Pen-testing & Security Audit", 75000.0, 150000.0),
        ("Corporate Training Workshop on Agile", 35000.0, 70000.0)
    ],
    "TRAVEL": [
        ("Tech Conference Passes & Accommodation", 40000.0, 80000.0),
        ("Client Site Visit Flight & Hotel", 30000.0, 60000.0)
    ],
    "MAINTENANCE": [
        ("HVAC Server Room Servicing Contract", 25000.0, 50000.0),
        ("Electrical Wiring Inspection & Repair", 15000.0, 30000.0)
    ]
}


def populate_verified_seed_records():
    """
    Populates the exact verified terminal records that exist in the PostgreSQL V2__seed_data.sql.
    These are flagged as real (is_synthetic=0) so RAG evidence grounding matches DB IDs.
    """
    verified = [
        {
            "requestId": "PR-1001",
            "title": "Laptops for Engineering Team",
            "description": "High performance developer laptops",
            "departmentId": 1,
            "category": "IT_EQUIPMENT",
            "priority": "NORMAL",
            "amount": 120000.00,
            "currency": "INR",
            "vendorId": 1,
            "itemCount": 2,
            "submittedAt": "2026-03-01T10:00:00+00:00",
            "budgetTotalAtSubmit": 1000000.00,
            "budgetRemainingAtSubmit": 880000.00,
            "outcome": "APPROVED",
            "rejectedAtStage": None,
            "updatedAt": "2026-03-02T14:00:00+00:00"
        },
        {
            "requestId": "PR-1002",
            "title": "Cloud Infrastructure Credits",
            "description": "Compute capacity scaling",
            "departmentId": 1,
            "category": "SERVICES",
            "priority": "HIGH",
            "amount": 80000.00,
            "currency": "INR",
            "vendorId": 2,
            "itemCount": 1,
            "submittedAt": "2026-03-05T11:00:00+00:00",
            "budgetTotalAtSubmit": 1000000.00,
            "budgetRemainingAtSubmit": 760000.00,
            "outcome": "APPROVED",
            "rejectedAtStage": None,
            "updatedAt": "2026-03-06T16:00:00+00:00"
        },
        {
            "requestId": "PR-1003",
            "title": "Executive Leather Chairs",
            "description": "Luxury seating for lounge area",
            "departmentId": 1,
            "category": "OFFICE_FURNITURE",
            "priority": "LOW",
            "amount": 250000.00,
            "currency": "INR",
            "vendorId": 3,
            "itemCount": 5,
            "submittedAt": "2026-03-10T14:00:00+00:00",
            "budgetTotalAtSubmit": 1000000.00,
            "budgetRemainingAtSubmit": 680000.00,
            "outcome": "REJECTED",
            "rejectedAtStage": "DEPARTMENT",
            "updatedAt": "2026-03-11T09:30:00+00:00"
        }
    ]
    for r in verified:
        local_store.upsert_historical_request(r, is_synthetic=False)


def generate_synthetic_dataset(n_samples: int = 1200, seed: int = 42) -> str:
    """
    Generates a clearly labeled synthetic development dataset for ML training.
    Saves to CSV and loads into local SQLite storage.
    """
    random.seed(seed)
    populate_verified_seed_records()

    csv_path = os.path.join(settings.dataset_dir, "synthetic_historical_requests.csv")
    os.makedirs(settings.dataset_dir, exist_ok=True)

    rows = []
    start_date = datetime(2025, 1, 1)

    for i in range(1, n_samples + 1):
        req_id = f"SYN-{2000 + i}"
        dept = random.choice(DEPARTMENTS)
        dept_id = dept["id"]
        total_budget = dept["budget"]

        category = random.choice(CATEGORIES)
        title_templates = TITLES_BY_CATEGORY[category]
        template = random.choice(title_templates)
        title, min_amt, max_amt = template

        # Sample amount
        amount = round(random.uniform(min_amt, max_amt), 2)
        # Occasionally introduce outliers
        if random.random() < 0.08:
            amount = round(amount * random.uniform(2.2, 3.5), 2)

        # Budget remaining at submit
        # Realistic: remaining drops over time or varies between 10% and 90%
        utilization_ratio = random.uniform(0.15, 0.95)
        budget_remaining = round(max(0.0, total_budget * (1.0 - utilization_ratio)), 2)

        vendor = random.choice(VENDORS)
        vendor_id = vendor["id"]
        priority = random.choice(["LOW", "NORMAL", "HIGH", "URGENT"])

        item_count = random.randint(1, 8)
        days_offset = random.randint(0, 365)
        submitted_at = (start_date + timedelta(days=days_offset, hours=random.randint(9, 17))).isoformat() + "Z"

        # Deterministic ground truth logic for synthetic label:
        # A request is more likely to be APPROVED if:
        # 1. amount <= budget_remaining
        # 2. amount <= 1.8 * typical average for category
        # 3. vendor is established
        # 4. utilization < 85%
        over_budget = amount > budget_remaining
        extreme_amount = amount > (max_amt * 1.8)
        unfamiliar_vendor = not vendor["established"]
        high_utilization = (budget_remaining / total_budget) < 0.15

        rejection_score = 0.0
        if over_budget:
            rejection_score += 0.55
        if extreme_amount:
            rejection_score += 0.35
        if unfamiliar_vendor and amount > 50000:
            rejection_score += 0.25
        if high_utilization:
            rejection_score += 0.20
        if priority == "LOW" and amount > 100000:
            rejection_score += 0.20

        # Add random noise
        rejection_score += random.uniform(-0.15, 0.15)
        outcome = "REJECTED" if rejection_score >= 0.45 else "APPROVED"

        rejected_at_stage = None
        if outcome == "REJECTED":
            rejected_at_stage = "DEPARTMENT" if over_budget or extreme_amount else "FINANCE"

        record = {
            "requestId": req_id,
            "title": title,
            "description": f"Procurement of {title} for {dept['name']}",
            "departmentId": dept_id,
            "category": category,
            "priority": priority,
            "amount": amount,
            "currency": "INR",
            "vendorId": vendor_id,
            "itemCount": item_count,
            "submittedAt": submitted_at,
            "budgetTotalAtSubmit": total_budget,
            "budgetRemainingAtSubmit": budget_remaining,
            "outcome": outcome,
            "rejectedAtStage": rejected_at_stage,
            "updatedAt": submitted_at,
            "is_synthetic": 1
        }

        rows.append(record)
        local_store.upsert_historical_request(record, is_synthetic=True)

    # Write CSV
    fieldnames = list(rows[0].keys())
    with open(csv_path, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    return csv_path

