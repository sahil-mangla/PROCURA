import math
import re
from typing import List, Dict, Any, Optional
from app.api.schemas import Evidence, AnalysisInput
from app.data.storage import local_store

def tokenize(text: str) -> set:
    if not text:
        return set()
    words = re.findall(r"\w+", text.lower())
    return set(words)


def text_similarity(text1: str, text2: str) -> float:
    tokens1 = tokenize(text1)
    tokens2 = tokenize(text2)
    if not tokens1 or not tokens2:
        return 0.0
    intersection = len(tokens1.intersection(tokens2))
    union = len(tokens1.union(tokens2))
    return float(intersection / union) if union > 0 else 0.0


def calculate_case_similarity(
    target: AnalysisInput,
    hist: Dict[str, Any]
) -> float:
    """
    Computes a multi-attribute similarity score between the new request and a historical request:
    - Category match (35%)
    - Department match (15%)
    - Amount proximity (30%)
    - Title / description text overlap (20%)
    """
    score = 0.0

    # 1. Category match
    hist_category = str(hist.get("category", "")).upper()
    target_category = str(target.category).upper()
    if hist_category == target_category:
        score += 0.35
    elif hist_category in ["IT_EQUIPMENT", "SOFTWARE"] and target_category in ["IT_EQUIPMENT", "SOFTWARE"]:
        score += 0.20

    # 2. Department match
    if int(hist.get("department_id", 0)) == target.departmentId:
        score += 0.15

    # 3. Amount proximity
    target_amount = float(target.amount)
    hist_amount = float(hist.get("amount", 0.0))
    if max(target_amount, hist_amount) > 0:
        ratio = abs(target_amount - hist_amount) / max(target_amount, hist_amount)
        amount_sim = max(0.0, 1.0 - ratio)
        score += 0.30 * amount_sim

    # 4. Description / Title similarity
    target_text = f"{target.title or ''} {target.requestDescription or ''}"
    hist_text = f"{hist.get('title', '')} {hist.get('description', '')}"
    txt_sim = text_similarity(target_text, hist_text)
    score += 0.20 * txt_sim

    return round(min(1.0, max(0.0, score)), 4)


class HistoricalRetriever:
    """
    Retrieves similar historical procurement cases for RAG evidence generation.
    Strictly grounds evidence in verified database records (e.g. PR-1001, PR-1002, PR-1003)
    to prevent backend validation errors (D7).
    """

    def __init__(self, store=None):
        self.store = store or local_store

    def retrieve_similar_cases(
        self,
        analysis_input: AnalysisInput,
        top_k: int = 3,
        min_similarity: float = 0.50
    ) -> List[Evidence]:
        """
        Retrieves top_k similar historical requests.
        Prioritizes verified backend records to guarantee that requestId exists in the backend DB.
        """
        # First, search verified non-synthetic requests
        verified_candidates = self.store.get_verified_requests(limit=50)

        # If not enough verified records exist, also inspect synced historical requests
        if len(verified_candidates) < top_k:
            all_candidates = self.store.get_all_requests(limit=200)
        else:
            all_candidates = verified_candidates

        # Exclude the current request if it happens to be in history (avoid self-matching)
        candidates = [c for c in all_candidates if c.get("request_id") != analysis_input.requestId]

        scored_cases = []
        for c in candidates:
            sim = calculate_case_similarity(analysis_input, c)
            scored_cases.append((sim, c))

        # Sort descending by similarity
        scored_cases.sort(key=lambda x: x[0], reverse=True)

        # Filter and convert to Evidence schema
        evidence_list: List[Evidence] = []
        for sim, c in scored_cases:
            if sim < min_similarity and len(evidence_list) >= 1:
                # If we already have at least one strong match, ignore weak matches
                continue

            summary = c.get("title") or c.get("description") or f"Historical request {c.get('request_id')}"
            outcome = "APPROVED" if str(c.get("outcome", "")).upper() == "APPROVED" else "REJECTED"

            evidence_list.append(Evidence(
                requestId=str(c.get("request_id")),
                summary=summary,
                amount=float(c.get("amount", 0.0)),
                outcome=outcome,
                similarity=sim
            ))

            if len(evidence_list) >= top_k:
                break

        return evidence_list

historical_retriever = HistoricalRetriever()

