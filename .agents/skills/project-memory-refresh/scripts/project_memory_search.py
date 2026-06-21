from __future__ import annotations

import re
from dataclasses import dataclass


CATEGORY_BOOST = {
    "summary": 2,
    "source-of-truth": 6,
    "alias": 7,
    "entry-point": 7,
    "fact": 4,
    "decision": 6,
    "hotspot": 6,
    "search-recipe": 7,
    "risk": 6,
    "refresh-trigger": 2,
    "memory": 3,
    "rules": 5,
    "openspec-proposal": 5,
    "openspec-task": 6,
    "openspec-spec": 6,
    "openspec-design": 5,
    "openspec-doc": 3,
    "openspec-index": 2,
    "archive-index": 2,
    "archive-doc": 1,
    "source-doc": 2,
}
CATEGORY_TO_SCOPE = {
    "summary": "memory",
    "source-of-truth": "memory",
    "alias": "memory",
    "entry-point": "memory",
    "fact": "memory",
    "decision": "memory",
    "hotspot": "memory",
    "search-recipe": "memory",
    "risk": "memory",
    "refresh-trigger": "memory",
    "memory": "memory",
    "rules": "rules",
    "openspec-proposal": "openspec",
    "openspec-task": "openspec",
    "openspec-spec": "openspec",
    "openspec-design": "openspec",
    "openspec-doc": "openspec",
    "openspec-index": "openspec",
    "archive-index": "archive",
    "archive-doc": "archive",
    "source-doc": "source",
}
INTENT_KEYWORDS = {
    "alias": {"alias", "aliases", "vocabulary", "term", "terms", "name", "names", "meaning", "call"},
    "entry": {"entry", "entrypoint", "entrypoints", "start", "starting", "begin", "first", "main", "root"},
    "decision": {"decision", "decisions", "why", "constraint", "constraints", "tradeoff", "tradeoffs"},
    "risk": {"risk", "risks", "hotspot", "hotspots", "fragile", "fragility", "danger", "unsafe"},
    "search": {"search", "grep", "rg", "find", "locate", "recipe", "recipes", "pattern", "patterns"},
    "rules": {"rule", "rules", "protocol", "protocols", "instruction", "instructions", "policy", "policies"},
    "archive": {"archive", "archives", "report", "reports", "checkpoint", "checkpoints", "handoff", "handoffs"},
    "openspec": {"openspec", "spec", "specs", "proposal", "proposals", "design", "designs", "task", "tasks", "change", "changes"},
}
INTENT_CATEGORY_BOOST = {
    "alias": {"alias": 10},
    "entry": {"entry-point": 10, "source-of-truth": 7, "source-doc": 3},
    "decision": {"decision": 10, "fact": 4},
    "risk": {"risk": 10, "hotspot": 8, "decision": 2},
    "search": {"search-recipe": 11, "entry-point": 3},
    "rules": {"rules": 10, "source-of-truth": 4},
    "archive": {"archive-index": 8, "archive-doc": 6},
    "openspec": {
        "openspec-task": 8,
        "openspec-spec": 8,
        "openspec-proposal": 7,
        "openspec-design": 6,
        "openspec-doc": 4,
        "openspec-index": 3,
    },
}
INTENT_SCOPE_BOOST = {
    "alias": {"memory": 3},
    "entry": {"memory": 3, "source": 1},
    "decision": {"memory": 3},
    "risk": {"memory": 3},
    "search": {"memory": 3},
    "rules": {"rules": 4},
    "archive": {"archive": 4},
    "openspec": {"openspec": 5},
}
STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "at",
    "for",
    "from",
    "how",
    "i",
    "in",
    "is",
    "it",
    "me",
    "of",
    "on",
    "or",
    "please",
    "show",
    "tell",
    "the",
    "to",
    "what",
    "where",
}
ID_PATTERN = re.compile(r"^[a-z]+-\d{3,}$")


@dataclass(frozen=True)
class QueryProfile:
    query: str
    normalized_query: str
    terms: list[str]
    dropped_terms: list[str]
    intents: list[str]
    explicit_category: str | None
    explicit_scope: str | None
    path_query: bool
    id_query: bool
    phrase_query: bool


def tokenize(text: str) -> list[str]:
    raw_tokens = re.findall(r"[a-zA-Z0-9_.:\\/-]+|[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3000-\u303f\uff00-\uffef]+", text.lower())
    return [token.strip("._:-/\\") for token in raw_tokens if token.strip("._:-/\\")]


def normalize_query(query: str) -> str:
    return query.strip().lower().replace("\\", "/")


def scope_for_category(category: str | None) -> str:
    return CATEGORY_TO_SCOPE.get(category or "", "source")


def category_for(path: str, heading: str) -> str:
    lower_path = path.lower()
    lower_heading = heading.lower()
    if lower_path.startswith("openspec/"):
        filename = lower_path.rsplit("/", 1)[-1]
        if filename == "proposal.md":
            return "openspec-proposal"
        if filename == "design.md":
            return "openspec-design"
        if filename == "tasks.md":
            return "openspec-task"
        if filename == "spec.md" or "/specs/" in lower_path:
            return "openspec-spec"
        if "/changes/" in lower_path:
            return "openspec-doc"
        return "openspec-index"
    if path == "MEMORY.md":
        if "source of truth" in lower_heading:
            return "source-of-truth"
        if "alias" in lower_heading:
            return "alias"
        if "entry point" in lower_heading:
            return "entry-point"
        if "stable fact" in lower_heading:
            return "fact"
        if "active decision" in lower_heading:
            return "decision"
        if "hotspot" in lower_heading:
            return "hotspot"
        if "search recipe" in lower_heading:
            return "search-recipe"
        if "open risk" in lower_heading:
            return "risk"
        if "next refresh trigger" in lower_heading:
            return "refresh-trigger"
        if "purpose snapshot" in lower_heading:
            return "summary"
        return "memory"
    if path == "AGENTS.md":
        return "rules"
    if path == "docs/INDEX.md":
        return "archive-index"
    if lower_path.startswith("docs/"):
        return "archive-doc"
    return "source-doc"


def build_query_profile(query: str, category: str | None = None, scope: str | None = None) -> QueryProfile:
    raw_terms = tokenize(query)
    filtered_terms: list[str] = []
    dropped_terms: list[str] = []
    for term in raw_terms:
        if _is_noise_term(term, raw_terms):
            dropped_terms.append(term)
            continue
        if term not in filtered_terms:
            filtered_terms.append(term)

    normalized_query = normalize_query(query)
    intents = sorted({intent for intent, keywords in INTENT_KEYWORDS.items() if any(term in keywords for term in filtered_terms)})
    return QueryProfile(
        query=query,
        normalized_query=normalized_query,
        terms=filtered_terms,
        dropped_terms=dropped_terms,
        intents=intents,
        explicit_category=category,
        explicit_scope=scope,
        path_query=_looks_like_path(query, filtered_terms),
        id_query=any(ID_PATTERN.match(term) for term in filtered_terms),
        phrase_query=len(normalized_query) >= 4 and " " in query.strip(),
    )


def search_entries(payload: dict, query: str, limit: int = 8, category: str | None = None, scope: str | None = None) -> dict:
    profile = build_query_profile(query, category=category, scope=scope)
    if not profile.terms and not profile.intents and not profile.path_query:
        return {
            "query": query,
            "category": category,
            "scope": scope,
            "profile": profile_to_dict(profile) | {"noise_only": True},
            "results": [],
        }

    scored: list[tuple[int, dict, list[str], list[str]]] = []
    for entry in payload.get("entries", []):
        entry_scope = entry.get("scope") or scope_for_category(entry.get("category"))
        if category and entry.get("category") != category:
            continue
        if scope and entry_scope != scope:
            continue
        score, matched_terms, reasons = score_entry(entry, profile, entry_scope)
        if score > 0:
            scored.append((score, entry, matched_terms, reasons))

    scored.sort(key=lambda item: (-item[0], item[1]["path"], item[1]["heading"]))
    results = []
    for score, entry, matched_terms, reasons in scored[:limit]:
        results.append(
            {
                "path": entry["path"],
                "heading": entry["heading"],
                "category": entry.get("category", "unknown"),
                "scope": entry.get("scope") or scope_for_category(entry.get("category")),
                "score": score,
                "snippet": entry["text"][:240],
                "matched_terms": matched_terms,
                "reasons": reasons,
            }
        )

    return {
        "query": query,
        "category": category,
        "scope": scope,
        "profile": profile_to_dict(profile),
        "results": results,
    }


def profile_to_dict(profile: QueryProfile) -> dict:
    return {
        "normalized_query": profile.normalized_query,
        "terms": profile.terms,
        "dropped_terms": profile.dropped_terms,
        "intents": profile.intents,
        "explicit_category": profile.explicit_category,
        "explicit_scope": profile.explicit_scope,
        "path_query": profile.path_query,
        "id_query": profile.id_query,
        "phrase_query": profile.phrase_query,
    }


def score_entry(entry: dict, profile: QueryProfile, entry_scope: str) -> tuple[int, list[str], list[str]]:
    path = str(entry.get("path") or "").lower().replace("\\", "/")
    heading = str(entry.get("heading") or "").lower()
    text = str(entry.get("text") or "").lower()
    category = str(entry.get("category") or "unknown")

    score = 0
    has_match = False
    matched_terms: list[str] = []
    reasons: list[str] = []

    for intent in profile.intents:
        category_bonus = INTENT_CATEGORY_BOOST.get(intent, {}).get(category, 0)
        scope_bonus = INTENT_SCOPE_BOOST.get(intent, {}).get(entry_scope, 0)
        if category_bonus:
            score += category_bonus
            reasons.append(f"intent:{intent}->category")
            has_match = True
        if scope_bonus:
            score += scope_bonus
            reasons.append(f"intent:{intent}->scope")
            has_match = True

    if profile.phrase_query and profile.normalized_query in " ".join(part for part in (path, heading, text) if part):
        score += 5
        reasons.append("phrase")
        has_match = True

    for term in profile.terms:
        term_score, matched = score_term(term, path, heading, text, profile)
        if term_score:
            score += term_score
            if matched:
                matched_terms.append(term)
                has_match = True
            reasons.extend(_term_reasons(term, path, heading, text, profile))

    if has_match:
        score += CATEGORY_BOOST.get(category, 0)
        if profile.explicit_scope and entry_scope == profile.explicit_scope:
            score += 2
        if profile.explicit_category and category == profile.explicit_category:
            score += 2
    else:
        score = 0

    matched_terms = _dedupe(matched_terms)
    reasons = _dedupe(reasons)
    return score, matched_terms, reasons


def score_term(term: str, path: str, heading: str, text: str, profile: QueryProfile) -> tuple[int, bool]:
    score = 0
    matched = False

    is_cjk = bool(re.search(r"[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3000-\u303f\uff00-\uffef]", term))
    if is_cjk:
        term_pat = re.compile(re.escape(term), re.IGNORECASE)
    else:
        term_pat = re.compile(rf"\b{re.escape(term)}\b", re.IGNORECASE)

    if term == path or path.endswith("/" + term):
        score += 12
        matched = True
    elif term_pat.search(path):
        score += 7 if profile.path_query else 5
        matched = True

    if term == heading:
        score += 10
        matched = True
    elif term_pat.search(heading):
        score += 6
        matched = True

    if profile.id_query and ID_PATTERN.match(term) and term_pat.search(text):
        score += 12
        matched = True
    elif term_pat.search(text):
        score += 3
        matched = True

    return score, matched


def _term_reasons(term: str, path: str, heading: str, text: str, profile: QueryProfile) -> list[str]:
    reasons: list[str] = []

    is_cjk = bool(re.search(r"[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3000-\u303f\uff00-\uffef]", term))
    if is_cjk:
        term_pat = re.compile(re.escape(term), re.IGNORECASE)
    else:
        term_pat = re.compile(rf"\b{re.escape(term)}\b", re.IGNORECASE)

    if term == path or path.endswith("/" + term):
        reasons.append(f"exact-path:{term}")
    elif term_pat.search(path):
        reasons.append(f"path:{term}")
    if term == heading:
        reasons.append(f"exact-heading:{term}")
    elif term_pat.search(heading):
        reasons.append(f"heading:{term}")
    if profile.id_query and ID_PATTERN.match(term) and term_pat.search(text):
        reasons.append(f"memory-id:{term}")
    elif term_pat.search(text):
        reasons.append(f"text:{term}")
    return reasons


def _looks_like_path(query: str, terms: list[str]) -> bool:
    if any(sep in query for sep in ("\\", "/", ".md", ".py", ".ps1", ".json", ".toml")):
        return True
    return any("/" in term or "." in term for term in terms)


def _is_noise_term(term: str, raw_terms: list[str]) -> bool:
    if term in STOPWORDS and len(raw_terms) > 1:
        return True
    if len(term) == 1 and not term.isdigit():
        return True
    return False


def _dedupe(items: list[str]) -> list[str]:
    unique: list[str] = []
    for item in items:
        if item not in unique:
            unique.append(item)
    return unique
