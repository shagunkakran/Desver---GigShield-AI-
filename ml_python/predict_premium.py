"""
stdin: JSON { "location": str, "features": { name: number, ... } }
stdout: JSON { weeklyPremiumDeltaINR, featureVector, rawScore }
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MODEL_PATH = ROOT.parent / "server" / "ml" / "sklearn_premium.json"


def main():
    raw = sys.stdin.read()
    if not raw.strip():
        print(json.dumps({"error": "empty stdin"}))
        sys.exit(1)
    data = json.loads(raw)
    features = data.get("features") or {}
    model = json.loads(MODEL_PATH.read_text(encoding="utf-8"))
    names = model["feature_names"]
    x = [float(features.get(n, 0) or 0) for n in names]
    coef = model["coefficients"]
    intercept = float(model.get("intercept", 0))
    raw_score = intercept + sum(c * v for c, v in zip(coef, x))
    delta = int(max(-25, min(40, round(raw_score))))
    out = {
        "weeklyPremiumDeltaINR": delta,
        "rawScore": raw_score,
        "featureVector": {n: x[i] for i, n in enumerate(names)},
    }
    print(json.dumps(out))


if __name__ == "__main__":
    main()
