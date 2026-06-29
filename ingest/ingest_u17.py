#!/usr/bin/env python3
"""
Pelada – FIFA U17 Women's World Cup 2024 ingest
Parses 31 FIFA Unified Event Data .xlsx files into Supabase.

This is the FIFA taxonomy (NOT StatsBomb). Key mappings:
  SHOT  = event 'attempt_at_goal'
  GOAL  = 'attempt_at_goal' row where outcome_additional == 'goal'
  Scores are DERIVED by counting goals per team per match.
  The pseudo-team 'TEAM REFEREES' is excluded everywhere.
There is NO xG column in the source.

Per-player TOURNAMENT aggregates and per-metric leaderboards are precomputed at
ingest time so creation-time reads are instant (hard product requirement).

Usage:
  # DRY RUN (default) — parses everything, prints validation, writes NOTHING:
  python3 ingest_u17.py

  # Real ingest (requires schema_u17.sql already run in Supabase):
  python3 ingest_u17.py --write

Prerequisites:
  pandas + openpyxl  (present in /Users/jessicafan/LIM/venv)
  supabase           (only needed for --write)

Run AFTER executing ingest/schema_u17.sql in the Supabase SQL Editor.
"""

import argparse, math, os, re, sys, glob
from pathlib import Path
import pandas as pd

# ── Config ──────────────────────────────────────────────────────────────────────

EVENTS_DIR = "/Users/jessicafan/LIM/Events"
FILE_GLOB  = os.path.join(EVENTS_DIR, "*.xlsx")
SHEET      = "Sheet1"
BATCH      = 500
REFEREE_TEAM = "TEAM REFEREES"

FNAME_RE = re.compile(
    r"(?P<date>\d{8})_FU17WWC_(?P<num>\d+)_(?P<home>[A-Z]+)-(?P<away>[A-Z]+)_"
)

# Stage inference from the match number. 16 teams:
#   1..24  group stage (3 rounds x 8 matches)
#   25..28 quarter-finals
#   29..30 semi-finals
#   31     final
# (No 3rd-place playoff file is present in the dataset.)
def infer_stage(num: int) -> str:
    if num <= 24:
        return "Group Stage"
    if num <= 28:
        return "Quarter-final"
    if num <= 30:
        return "Semi-final"
    if num == 31:
        return "Final"
    return "Unknown"

# Top-N for precomputed leaderboards.
LEADERBOARD_N = 25
LEADERBOARD_METRICS = [
    "goals", "shots", "assists", "passes", "passes_complete", "receptions",
    "line_breaks", "pressings", "offers", "ball_progressions", "crosses",
    "tackles", "clearances", "blocks", "interceptions", "aerial_duels",
    "aerial_duels_won", "fouls_committed", "events_total",
]


# ── Helpers (mirror ingest_wwc.py) ──────────────────────────────────────────────

def _safe(v):
    if v is None:
        return None
    try:
        if isinstance(v, float) and math.isnan(v):
            return None
    except Exception:
        pass
    try:
        if pd.isnull(v):
            return None
    except Exception:
        pass
    return v

def _str(v):
    s = _safe(v)
    if s is None:
        return ""
    s = str(s).strip()
    return "" if s.lower() == "nan" else s

def _int(v):
    s = _safe(v)
    try:
        return int(float(s)) if s is not None else 0
    except Exception:
        return 0

def _int_opt(v):
    s = _safe(v)
    if s is None:
        return None
    try:
        return int(float(s))
    except Exception:
        return None

def _float(v):
    s = _safe(v)
    try:
        return float(s) if s is not None else None
    except Exception:
        return None


# ── Parse one match file ────────────────────────────────────────────────────────

def parse_match_file(path: str) -> dict:
    """Returns a dict with match meta, the cleaned DataFrame, lineups and a
    per-player stat dict for this match."""
    base = os.path.basename(path)
    m = FNAME_RE.match(base)
    if not m:
        raise ValueError(f"Filename does not match expected pattern: {base}")

    num   = int(m.group("num"))
    date  = m.group("date")
    home  = m.group("home")
    away  = m.group("away")
    iso_date = f"{date[0:4]}-{date[4:6]}-{date[6:8]}"

    df = pd.read_excel(path, sheet_name=SHEET)
    df = df[df["team_name"] != REFEREE_TEAM].copy()

    source_match_id = _int_opt(df["match_id"].iloc[0]) if len(df) else None

    # Goals: attempt_at_goal rows with outcome_additional == 'goal'
    is_shot = df["event"] == "attempt_at_goal"
    is_goal = is_shot & (df["outcome_additional"].astype(str) == "goal")

    home_score = 0
    away_score = 0
    home_name = home
    away_name = away
    # team_name in the data is a full name (e.g. 'USA', 'ENGLAND'); map goals to
    # the home/away codes via team_id ordering. We instead count goals by team_name
    # then attribute to home/away by matching which team_name maps to which code.
    goal_rows = df[is_goal]
    goals_by_team = goal_rows["team_name"].value_counts().to_dict()

    # Determine which team_name is home vs away. The data has exactly two real
    # team_names. We line them up to the filename codes by position in the file:
    # the home team usually kicks off, but to be robust we just map the two names
    # to home/away codes by appearance order won't be reliable, so use a code map.
    team_names = [t for t in df["team_name"].dropna().unique()]
    code_map = _map_codes_to_names(team_names, home, away)
    home_name = code_map.get(home, home)
    away_name = code_map.get(away, away)
    home_score = int(goals_by_team.get(home_name, 0))
    away_score = int(goals_by_team.get(away_name, 0))

    meta = {
        "match_id":          num,
        "source_match_id":   source_match_id,
        "match_date":        iso_date,
        "home_team":         home,
        "away_team":         away,
        "home_team_name":    home_name,
        "away_team_name":    away_name,
        "home_score":        home_score,
        "away_score":        away_score,
        "competition_stage": infer_stage(num),
        "total_events":      int(len(df)),
    }

    df["_is_shot"] = is_shot
    df["_is_goal"] = is_goal
    return {"meta": meta, "df": df}


# Common code → full-name mappings seen in FIFA data. Falls back to fuzzy match.
_CODE_NAMES = {
    "USA": ["USA"], "ENG": ["ENGLAND"], "ESP": ["SPAIN"], "KOR": ["KOREA REPUBLIC", "SOUTH KOREA"],
    "PRK": ["KOREA DPR", "NORTH KOREA"], "MEX": ["MEXICO"], "COL": ["COLOMBIA"],
    "BRA": ["BRAZIL"], "JPN": ["JAPAN"], "POL": ["POLAND"], "NGA": ["NIGERIA"],
    "ZAM": ["ZAMBIA"], "KEN": ["KENYA"], "ECU": ["ECUADOR"], "DOM": ["DOMINICAN REPUBLIC"],
    "NZL": ["NEW ZEALAND"],
}

def _map_codes_to_names(team_names, home, away):
    """Map the two filename codes (home, away) to the two team_name strings found
    in the file. Robust to ordering."""
    names = list(team_names)
    out = {}
    for code in (home, away):
        match = None
        candidates = _CODE_NAMES.get(code, []) + [code]
        for cand in candidates:
            for n in names:
                if n and (n.upper() == cand.upper() or cand.upper() in n.upper()):
                    match = n
                    break
            if match:
                break
        if match is None and len(names) == 2:
            # exactly two teams: assign whichever is left
            assigned = set(out.values())
            leftover = [n for n in names if n not in assigned]
            match = leftover[0] if leftover else (names[0] if names else code)
        out[code] = match if match else code
    return out


# ── Aggregation ─────────────────────────────────────────────────────────────────

def new_player_stat(pid, name, team, shirt):
    return {
        "player_id": pid, "player_name": name, "team": team,
        "shirt_number": shirt,
        "appearances": 0, "minutes_estimate": 0.0, "events_total": 0,
        "passes": 0, "passes_complete": 0, "receptions": 0,
        "shots": 0, "goals": 0, "assists": 0, "crosses": 0,
        "line_breaks": 0, "line_break_attempts": 0,
        "pressings": 0, "offers": 0, "ball_progressions": 0,
        "tackles": 0, "clearances": 0, "blocks": 0, "interceptions": 0,
        "aerial_duels": 0, "aerial_duels_won": 0,
        "fouls_committed": 0, "throwins": 0, "freekicks": 0,
        "_match_ids": set(),
    }


def accumulate(df, agg: dict, lineups_out: list, match_id: int):
    """Accumulate one match's events into the tournament-level `agg` dict
    (keyed by player_id), and append per-match lineup rows to `lineups_out`."""
    # Per-match lineup: every player with >=1 event for their team.
    match_players = {}  # pid -> {name, team, shirt, events}

    for row in df.itertuples(index=False):
        d = row._asdict()
        pid   = _int_opt(d.get("from_player_id"))
        name  = _str(d.get("from_player_name"))
        team  = _str(d.get("team_name"))
        shirt = _int_opt(d.get("from_player_shirt_number"))
        ev    = _str(d.get("event"))
        if not name and pid is None:
            continue

        key = pid if pid is not None else f"name:{name}"

        # lineup tracking
        if key not in match_players:
            match_players[key] = {"player_id": pid, "player_name": name,
                                  "team": team, "shirt_number": shirt, "events": 0}
        match_players[key]["events"] += 1

        # tournament aggregate
        if key not in agg:
            agg[key] = new_player_stat(pid, name, team, shirt)
        s = agg[key]
        s["_match_ids"].add(match_id)
        s["events_total"] += 1
        if not s["player_name"] and name:
            s["player_name"] = name
        if not s["team"] and team:
            s["team"] = team
        if s["shirt_number"] is None and shirt is not None:
            s["shirt_number"] = shirt

        outcome     = _str(d.get("outcome"))
        outcome_add = _str(d.get("outcome_additional"))
        lb_outcome  = _str(d.get("line_break_outcome"))

        if ev == "pass":
            s["passes"] += 1
            if outcome == "possession_complete":
                s["passes_complete"] += 1
        elif ev == "reception":
            s["receptions"] += 1
        elif ev == "attempt_at_goal":
            s["shots"] += 1
            if outcome_add == "goal":
                s["goals"] += 1
        elif ev == "assist":
            s["assists"] += 1
        elif ev == "cross":
            s["crosses"] += 1
        elif ev == "pressing":
            s["pressings"] += 1
        elif ev == "offer":
            s["offers"] += 1
        elif ev == "ball_progression":
            s["ball_progressions"] += 1
        elif ev == "tackle":
            s["tackles"] += 1
        elif ev == "clearance":
            s["clearances"] += 1
        elif ev == "block":
            s["blocks"] += 1
        elif ev == "interception":
            s["interceptions"] += 1
        elif ev == "aerial_duel":
            s["aerial_duels"] += 1
            if outcome in ("possession_won", "possession_retained"):
                s["aerial_duels_won"] += 1
        elif ev == "foul_against":
            # 'foul_against' = a foul committed by this player against an opponent
            s["fouls_committed"] += 1
        elif ev == "throwin":
            s["throwins"] += 1
        elif ev == "freekick":
            s["freekicks"] += 1

        # line breaks apply across multiple event types (pass, ball_progression, ...)
        if lb_outcome in ("line_break_complete", "line_break_incomplete"):
            s["line_break_attempts"] += 1
            if lb_outcome == "line_break_complete":
                s["line_breaks"] += 1

    # flush per-match lineup rows
    for v in match_players.values():
        lineups_out.append({
            "match_id":     match_id,
            "team":         v["team"],
            "player_id":    v["player_id"],
            "player_name":  v["player_name"],
            "shirt_number": v["shirt_number"],
            "events":       v["events"],
        })


def finalize_player_stats(agg: dict) -> list:
    rows = []
    for s in agg.values():
        appearances = len(s["_match_ids"])
        passes = s["passes"]
        row = {k: v for k, v in s.items() if not k.startswith("_")}
        row["appearances"] = appearances
        row["minutes_estimate"] = appearances * 90.0
        row["pass_pct"] = (s["passes_complete"] / passes) if passes else 0.0
        rows.append(row)
    return rows


def build_leaderboards(player_rows: list) -> list:
    lb_rows = []
    for metric in LEADERBOARD_METRICS:
        ranked = sorted(player_rows, key=lambda r: (r.get(metric, 0) or 0), reverse=True)
        rank = 0
        for r in ranked[:LEADERBOARD_N]:
            val = r.get(metric, 0) or 0
            if val <= 0:
                continue
            rank += 1
            lb_rows.append({
                "metric": metric, "rank": rank,
                "player_id": r["player_id"], "player_name": r["player_name"],
                "team": r["team"], "value": float(val),
                "appearances": r["appearances"],
            })
    return lb_rows


# ── Event rows (for the events table) ───────────────────────────────────────────

def event_rows_for_match(df, meta) -> list:
    rows = []
    mid = meta["match_id"]
    smid = meta["source_match_id"]
    for i, row in enumerate(df.itertuples(index=False)):
        d = row._asdict()
        eid = _str(d.get("event_id"))
        if not eid:
            continue
        # FIFA event_id is NOT unique within a match, so synthesize a globally
        # unique PK from match_id + the per-match row index.
        rows.append({
            "event_id":           f"{mid}:{i}",
            "match_id":           mid,
            "source_match_id":    smid,
            "event_order":        _int_opt(d.get("event_order")),
            "half_time":          _int_opt(d.get("half_time")),
            "match_time_in_ms":   _int_opt(d.get("match_time_in_ms")),
            "team_id":            _int_opt(d.get("team_id")),
            "team_name":          _str(d.get("team_name")),
            "from_player_id":     _int_opt(d.get("from_player_id")),
            "from_player_name":   _str(d.get("from_player_name")),
            "from_shirt_number":  _int_opt(d.get("from_player_shirt_number")),
            "to_player_id":       _int_opt(d.get("to_player_id")),
            "to_player_name":     _str(d.get("to_player_name")),
            "category":           _str(d.get("category")),
            "event_type":         _str(d.get("event_type")),
            "event":              _str(d.get("event")),
            "action_type":        _str(d.get("action_type")),
            "side":               _str(d.get("side")),
            "sequence_type":      _str(d.get("sequence_type")),
            "outcome":            _str(d.get("outcome")),
            "outcome_additional": _str(d.get("outcome_additional")),
            "body_type":          _str(d.get("body_type")),
            "direction":          _str(d.get("direction")),
            "pressure":           _str(d.get("pressure")),
            "style":              _str(d.get("style")),
            "game_state":         _str(d.get("game_state")),
            "game_period":        _str(d.get("game_period")),
            "origin":             _str(d.get("origin")),
            "save_type":          _str(d.get("save_type")),
            "save_detail":        _str(d.get("save_detail")),
            "movement":           _str(d.get("movement")),
            "line_break_direction": _str(d.get("line_break_direction")),
            "line_break_outcome": _str(d.get("line_break_outcome")),
            "team_shape":         _str(d.get("team_shape")),
            "team_unit":          _str(d.get("team_unit")),
            "team_units_broken":  _int_opt(d.get("team_units_broken")),
            "total_team_units":   _int_opt(d.get("total_team_units")),
            "opposition_touch":   _str(d.get("opposition_touch")),
            "x":                  _float(d.get("x")),
            "y":                  _float(d.get("y")),
            "x_mirrored":         _float(d.get("x_mirrored")),
            "y_mirrored":         _float(d.get("y_mirrored")),
            "x_location_start":   _float(d.get("x_location_start")),
            "y_location_start":   _float(d.get("y_location_start")),
            "x_location_end":     _float(d.get("x_location_end")),
            "y_location_end":     _float(d.get("y_location_end")),
            "is_shot":            bool(d.get("_is_shot")),
            "is_goal":            bool(d.get("_is_goal")),
        })
    return rows


# ── Supabase write path (only with --write) ─────────────────────────────────────

def _load_env():
    env_file = Path(__file__).parent.parent / ".env.local"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip())


def _make_client():
    _load_env()
    from supabase import create_client
    url = os.environ["VITE_SUPABASE_URL"]
    key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ["VITE_SUPABASE_KEY"]
    return create_client(url, key)


def _batched(client, table: str, rows: list, size: int = BATCH):
    total = len(rows)
    for i in range(0, total, size):
        chunk = rows[i:i + size]
        client.table(table).upsert(chunk).execute()
        print(f"    {table}: {min(i + size, total)}/{total}")


def write_all(client, matches, lineups, events, player_stats, leaderboards):
    print("\n[write] matches...")
    _batched(client, "u17wwc_matches", matches)
    print("[write] clearing + writing lineups...")
    client.table("u17wwc_lineups").delete().neq("id", 0).execute()
    _batched(client, "u17wwc_lineups", lineups)
    print("[write] clearing + writing events...")
    client.table("u17wwc_events").delete().neq("match_id", 0).execute()
    _batched(client, "u17wwc_events", events)
    print("[write] player_stats...")
    client.table("u17wwc_player_stats").delete().neq("id", 0).execute()
    _batched(client, "u17wwc_player_stats", player_stats)
    print("[write] leaderboards...")
    client.table("u17wwc_leaderboards").delete().neq("id", 0).execute()
    _batched(client, "u17wwc_leaderboards", leaderboards)


# ── Main ────────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description="FIFA U17 WWC 2024 ingest")
    ap.add_argument("--write", action="store_true",
                    help="Write to Supabase (default: DRY RUN, no network).")
    args = ap.parse_args()

    files = sorted(glob.glob(FILE_GLOB))
    print("=" * 64)
    print(f"Pelada Ingest — FIFA U17 WWC 2024  ({'WRITE' if args.write else 'DRY RUN'})")
    print("=" * 64)
    print(f"Found {len(files)} files in {EVENTS_DIR}\n")
    if not files:
        print("No files found — aborting.")
        sys.exit(1)

    matches_rows = []
    lineups_rows = []
    events_rows  = []
    agg = {}  # tournament player aggregate (keyed by player_id / name)

    total_events = 0
    failures = []

    for path in files:
        try:
            parsed = parse_match_file(path)
        except Exception as e:
            failures.append((os.path.basename(path), str(e)))
            print(f"  ✗ {os.path.basename(path)}: {e}")
            continue
        meta = parsed["meta"]
        df = parsed["df"]
        matches_rows.append(meta)
        accumulate(df, agg, lineups_rows, meta["match_id"])
        events_rows.extend(event_rows_for_match(df, meta))
        total_events += meta["total_events"]
        print(f"  ✓ M{meta['match_id']:>2} {meta['match_date']}  "
              f"{meta['home_team']} {meta['home_score']}-{meta['away_score']} {meta['away_team']}  "
              f"[{meta['competition_stage']}]  events={meta['total_events']}")

    player_stats = finalize_player_stats(agg)
    leaderboards = build_leaderboards(player_stats)

    # ── Validation summary ──────────────────────────────────────────────────────
    print("\n" + "=" * 64)
    print("VALIDATION SUMMARY")
    print("=" * 64)
    print(f"Files parsed cleanly : {len(matches_rows)}/{len(files)}")
    if failures:
        print(f"Failures             : {failures}")
    print(f"Total events         : {total_events:,}")
    teams = sorted({m['home_team_name'] for m in matches_rows} |
                   {m['away_team_name'] for m in matches_rows})
    print(f"Distinct teams       : {len(teams)}  {teams}")
    print(f"Distinct players     : {len(player_stats)}")
    null_id = sum(1 for r in player_stats if r['player_id'] is None)
    print(f"Players w/ null id   : {null_id}")

    print("\nKey final/known matches:")
    for mid in (3, 30, 31):
        for m in matches_rows:
            if m["match_id"] == mid:
                print(f"  M{mid}: {m['home_team']} {m['home_score']}-{m['away_score']} "
                      f"{m['away_team']}  [{m['competition_stage']}]")

    def _top(metric, n=10):
        ranked = sorted(player_stats, key=lambda r: (r.get(metric, 0) or 0), reverse=True)
        print(f"\nTop {n} — {metric}:")
        for i, r in enumerate(ranked[:n], 1):
            print(f"  {i:>2}. {r['player_name']:<24} {r['team']:<18} "
                  f"{metric}={r.get(metric, 0)}  (apps={r['appearances']})")

    _top("goals")
    _top("line_breaks")
    _top("pressings")

    print("\nCaveats / approximations:")
    print("  - NO real minutes in source: minutes_estimate = appearances * 90.")
    print("  - 'appearances' = matches with >=1 recorded event (proxy, NOT official XI).")
    print("  - No xG in source (FIFA taxonomy); shots = attempt_at_goal.")
    print("  - Scores DERIVED from goal events (attempt_at_goal + outcome_additional='goal').")
    print("  - Stage inferred from match number; no 3rd-place playoff file present.")
    print("  - Lineups derived from on-ball events, not official team sheets.")

    print(f"\nRow counts ready to write: matches={len(matches_rows)} "
          f"lineups={len(lineups_rows)} events={len(events_rows)} "
          f"player_stats={len(player_stats)} leaderboards={len(leaderboards)}")

    if not args.write:
        print("\nDRY RUN complete — nothing written. Re-run with --write to ingest.")
        return

    client = _make_client()
    write_all(client, matches_rows, lineups_rows, events_rows, player_stats, leaderboards)
    print("\n✅  Ingest complete!")


if __name__ == "__main__":
    main()
