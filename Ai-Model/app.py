from typing import Any, Dict, List, Optional
import os
import pickle
import logging

from fastapi import FastAPI, HTTPException, Security, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security.api_key import APIKeyHeader
from pydantic import BaseModel, Field

try:
    import pandas as pd
except Exception:
    pd = None

API_KEY = "SusamSecretAndhoMancheleMovieHeryo"
API_KEY_NAME = "X-API-KEY"

app = FastAPI(title="ASD Risk Screening API")

logger = logging.getLogger("asd_risk_api")
if not logger.handlers:
    logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "xgb_model.pkl")
MODEL_COLUMNS_PATH = os.path.join(BASE_DIR, "model_columns.pkl")
NUM_COLS_PATH = os.path.join(BASE_DIR, "num_cols.pkl")
CAT_COLS_PATH = os.path.join(BASE_DIR, "cat_cols.pkl")
NUM_FILL_PATH = os.path.join(BASE_DIR, "num_fill.pkl")
CAT_FILL_PATH = os.path.join(BASE_DIR, "cat_fill.pkl")

MODEL_BLEND_WEIGHT = float(os.getenv("MODEL_BLEND_WEIGHT", "0.65"))
RULE_BLEND_WEIGHT = float(os.getenv("RULE_BLEND_WEIGHT", "0.35"))

MODEL = None
MODEL_COLUMNS: List[str] = []
NUM_COLS: List[str] = []
CAT_COLS: List[str] = []
NUM_FILL: Dict[str, Any] = {}
CAT_FILL: Dict[str, Any] = {}
MODEL_LOADED = False
MODEL_LOAD_ERROR: Optional[str] = None
MODEL_VERSION = "xgb_rules_blend_v1"

raw_origins = os.getenv(
    "AI_ALLOWED_ORIGINS",
    "http://localhost:5173,"
    "http://127.0.0.1:5173,"
    "http://localhost:8081,"
    "http://127.0.0.1:8081,"
    "http://213.145.86.157:5173,"
    "http://213.145.86.157:8081",
)

allowed_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)


def verify_api_key(api_key: str = Security(api_key_header)) -> str:
    if api_key != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key.",
        )
    return api_key


class QuestionnaireFeatures(BaseModel):
    age_months: float = Field(..., ge=0)
    sex: int = Field(..., ge=0, le=1)
    residence: int = Field(..., ge=0, le=1)
    parental_education: int = Field(..., ge=0, le=3)
    family_history_asd: int = Field(..., ge=0, le=1)
    preeclampsia: int = Field(..., ge=0, le=1)
    preterm_birth: int = Field(..., ge=0, le=1)
    birth_asphyxia: int = Field(..., ge=0, le=1)
    low_birth_weight: int = Field(..., ge=0, le=1)
    eye_contact_age_months: float = Field(..., ge=0)
    social_smile_months: float = Field(..., ge=0)
    intellectual_disability: int = Field(..., ge=0, le=1)
    epilepsy: int = Field(..., ge=0, le=1)
    adhd: int = Field(..., ge=0, le=1)
    language_disorder: int = Field(..., ge=0, le=1)
    motor_delay: int = Field(..., ge=0, le=1)
    screening_done: Optional[int] = None
    screening_result: Optional[int] = None


class PredictRequest(BaseModel):
    features: QuestionnaireFeatures


class PredictResponse(BaseModel):
    asd_probability_score: float
    prediction: int
    risk_level: str
    model_probability_score: Optional[float] = None
    rule_probability_score: Optional[float] = None
    model_version: str = MODEL_VERSION


def _load_pickle(path: str):
    with open(path, "rb") as f:
        return pickle.load(f)


def load_model_assets() -> None:
    global MODEL, MODEL_COLUMNS, NUM_COLS, CAT_COLS, NUM_FILL, CAT_FILL
    global MODEL_LOADED, MODEL_LOAD_ERROR

    if pd is None:
        MODEL_LOADED = False
        MODEL_LOAD_ERROR = "pandas is not installed"
        logger.warning("Model loading skipped: %s", MODEL_LOAD_ERROR)
        return

    try:
        MODEL = _load_pickle(MODEL_PATH)

        if os.path.exists(MODEL_COLUMNS_PATH):
            MODEL_COLUMNS = list(_load_pickle(MODEL_COLUMNS_PATH))
        if os.path.exists(NUM_COLS_PATH):
            NUM_COLS = list(_load_pickle(NUM_COLS_PATH))
        if os.path.exists(CAT_COLS_PATH):
            CAT_COLS = list(_load_pickle(CAT_COLS_PATH))
        if os.path.exists(NUM_FILL_PATH):
            NUM_FILL = dict(_load_pickle(NUM_FILL_PATH))
        if os.path.exists(CAT_FILL_PATH):
            CAT_FILL = dict(_load_pickle(CAT_FILL_PATH))

        MODEL_LOADED = True
        MODEL_LOAD_ERROR = None
        logger.info(
            "XGBoost model loaded. model_columns=%s num_cols=%s cat_cols=%s",
            len(MODEL_COLUMNS),
            len(NUM_COLS),
            len(CAT_COLS),
        )
    except Exception as ex:
        MODEL_LOADED = False
        MODEL_LOAD_ERROR = str(ex)
        logger.exception("Failed to load model assets")


def _prepare_model_frame(row: Dict[str, Any]):
    if pd is None:
        raise RuntimeError("pandas is not available")

    df = pd.DataFrame([row])

    for col in NUM_COLS:
        if col not in df.columns:
            df[col] = NUM_FILL.get(col, 0)
    for col in CAT_COLS:
        if col not in df.columns:
            df[col] = CAT_FILL.get(col, "missing")

    if NUM_COLS:
        for col in NUM_COLS:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(NUM_FILL.get(col, 0))

    if CAT_COLS:
        for col in CAT_COLS:
            df[col] = df[col].fillna(CAT_FILL.get(col, "missing")).astype(str)
        df = pd.get_dummies(df, columns=CAT_COLS)

    if MODEL_COLUMNS:
        df = df.reindex(columns=MODEL_COLUMNS, fill_value=0)

    return df


def model_probability_score(row: Dict[str, Any]) -> Optional[float]:
    if not MODEL_LOADED or MODEL is None:
        return None

    try:
        x = _prepare_model_frame(row)

        if hasattr(MODEL, "predict_proba"):
            prob = float(MODEL.predict_proba(x)[0][1])
        else:
            prob = float(MODEL.predict(x)[0])

        return max(0.0, min(1.0, prob))
    except Exception:
        logger.exception("Model prediction failed, falling back to rules score")
        return None


def blended_probability(rule_probability: float, model_probability: Optional[float]) -> float:
    if model_probability is None:
        return rule_probability

    model_w = max(0.0, MODEL_BLEND_WEIGHT)
    rule_w = max(0.0, RULE_BLEND_WEIGHT)
    total_w = model_w + rule_w

    if total_w <= 0.0:
        return model_probability

    return (model_probability * model_w + rule_probability * rule_w) / total_w


def questionnaire_risk_score(row: dict) -> float:
    score = 0.02

    if row["family_history_asd"] == 1:
        score += 0.10
    if row["preeclampsia"] == 1:
        score += 0.05
    if row["preterm_birth"] == 1:
        score += 0.07
    if row["birth_asphyxia"] == 1:
        score += 0.08
    if row["low_birth_weight"] == 1:
        score += 0.06

    if row["language_disorder"] == 1:
        score += 0.20
    if row["motor_delay"] == 1:
        score += 0.12
    if row["intellectual_disability"] == 1:
        score += 0.10
    if row["adhd"] == 1:
        score += 0.05
    if row["epilepsy"] == 1:
        score += 0.04

    if row["eye_contact_age_months"] > 12:
        score += 0.18
    elif row["eye_contact_age_months"] > 8:
        score += 0.10
    elif row["eye_contact_age_months"] > 6:
        score += 0.05

    if row["social_smile_months"] > 6:
        score += 0.15
    elif row["social_smile_months"] > 4:
        score += 0.08
    elif row["social_smile_months"] > 3:
        score += 0.04

    if row["age_months"] < 24 and (
        row["language_disorder"] == 1 or row["motor_delay"] == 1
    ):
        score += 0.05

    if row["screening_done"] == 1:
        if row["screening_result"] == 1:
            score += 0.10
        elif row["screening_result"] == 2:
            score += 0.03

    return min(score, 0.95)


def get_risk_level(probability: float) -> str:
    percent = probability * 100.0

    if percent <= 10.0:
        return "Very Low"
    elif percent <= 25.0:
        return "Low"
    elif percent <= 50.0:
        return "Moderate"
    elif percent <= 75.0:
        return "High"
    return "Very High"


load_model_assets()


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": MODEL_LOADED,
        "model_type": "xgboost_plus_rule_blend" if MODEL_LOADED else "rule_based_fallback",
        "model_version": MODEL_VERSION,
        "model_load_error": MODEL_LOAD_ERROR,
    }


@app.post("/predict", response_model=PredictResponse)
def predict(body: PredictRequest, _: str = Security(verify_api_key)):
    f = body.features

    row = {
        "age_months": f.age_months,
        "sex": f.sex,
        "residence": f.residence,
        "parental_education": f.parental_education,
        "family_history_asd": f.family_history_asd,
        "preeclampsia": f.preeclampsia,
        "preterm_birth": f.preterm_birth,
        "birth_asphyxia": f.birth_asphyxia,
        "low_birth_weight": f.low_birth_weight,
        "eye_contact_age_months": f.eye_contact_age_months,
        "social_smile_months": f.social_smile_months,
        "intellectual_disability": f.intellectual_disability,
        "epilepsy": f.epilepsy,
        "adhd": f.adhd,
        "language_disorder": f.language_disorder,
        "motor_delay": f.motor_delay,
        "screening_done": f.screening_done if f.screening_done is not None else 0,
        "screening_result": f.screening_result if f.screening_result is not None else 0,
    }

    rule_probability = questionnaire_risk_score(row)
    model_probability = model_probability_score(row)
    probability = blended_probability(rule_probability, model_probability)
    probability = round(max(0.01, min(0.99, probability)), 4)

    prediction = 1 if probability >= 0.50 else 0
    risk_level = get_risk_level(probability)

    return PredictResponse(
        asd_probability_score=probability,
        prediction=prediction,
        risk_level=risk_level,
        model_probability_score=(round(model_probability, 4) if model_probability is not None else None),
        rule_probability_score=round(rule_probability, 4),
    )
