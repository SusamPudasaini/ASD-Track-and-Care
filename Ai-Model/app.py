from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
import joblib
import pandas as pd
from pathlib import Path

app = FastAPI(title="ASD Model Service")

API_KEY = "SusamSecretAndhoMancheleMovieHeryo"
LEAKAGE_COLS = {"screening_done", "screening_result"}


def must_load(path: str):
    p = Path(path)
    if not p.exists():
        raise RuntimeError(f"Missing required file: {p.resolve()}")
    return joblib.load(p)


model = must_load("xgb_model.pkl")
model_columns = must_load("model_columns.pkl")

num_cols = must_load("num_cols.pkl")
cat_cols = must_load("cat_cols.pkl")
num_fill = must_load("num_fill.pkl")
cat_fill = must_load("cat_fill.pkl")


class PredictRequest(BaseModel):
    features: Dict[str, Any]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict")
def predict(req: PredictRequest, x_api_key: Optional[str] = Header(default=None)):
    # Auth
    if not x_api_key or x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Remove leakage features
    cleaned = {k: v for k, v in req.features.items() if k not in LEAKAGE_COLS}

    X_raw = pd.DataFrame([cleaned])

    for c in num_cols:
        if c not in X_raw.columns:
            X_raw[c] = num_fill.get(c, 0)
        X_raw[c] = pd.to_numeric(X_raw[c], errors="coerce")
        X_raw[c] = X_raw[c].fillna(num_fill.get(c, 0))

    for c in cat_cols:
        if c not in X_raw.columns:
            X_raw[c] = cat_fill.get(c, "missing")
        X_raw[c] = X_raw[c].where(X_raw[c].notna(), cat_fill.get(c, "missing"))
        X_raw[c] = X_raw[c].astype(str)

    # One-hot encode and align to training columns
    X_enc = pd.get_dummies(X_raw, columns=cat_cols, drop_first=True)
    X_enc = X_enc.reindex(columns=model_columns, fill_value=0)

    # Predict
    try:
        pred = float(model.predict(X_enc)[0])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")

    return {"asd_probability_score": pred}
