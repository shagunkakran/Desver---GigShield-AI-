"""
Train a small sklearn LinearRegression for weekly premium delta (INR).
Writes ../server/ml/sklearn_premium.json for Node + predict_premium.py
"""

from pathlib import Path
import json
import numpy as np
from sklearn.linear_model import LinearRegression

ROOT = Path(__file__).resolve().parent
OUT = ROOT.parent / "server" / "ml" / "sklearn_premium.json"

FEATURE_NAMES = [
    "rainProbabilityNext24h",
    "aqiRisk",
    "waterLoggingSafe",
    "highFloodCity",
    "publicHolidayIndia",
    "mockTrafficDisruption",
]

rng = np.random.default_rng(42)
n = 400
X = np.zeros((n, len(FEATURE_NAMES)))

X[:, 0] = rng.uniform(0, 1, n)
X[:, 1] = rng.uniform(0, 1, n)
X[:, 2] = rng.integers(0, 2, n)
X[:, 3] = rng.integers(0, 2, n)
X[:, 4] = rng.integers(0, 2, n)
X[:, 5] = rng.integers(0, 2, n)

# Synthetic target aligned with product story: safe zone lowers premium; rain/aqi raise it
y = (
    4.0 * X[:, 0]
    + 3.0 * X[:, 1]
    - 2.0 * X[:, 2]
    + 5.0 * X[:, 3] * X[:, 0]
    + 3.0 * X[:, 4]
    + 5.0 * X[:, 5]
    + rng.normal(0, 0.4, n)
)

model = LinearRegression()
model.fit(X, y)

OUT.parent.mkdir(parents=True, exist_ok=True)
payload = {
    "feature_names": FEATURE_NAMES,
    "coefficients": model.coef_.tolist(),
    "intercept": float(model.intercept_),
    "trained_samples": n,
}
OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
print(f"Wrote {OUT}")
