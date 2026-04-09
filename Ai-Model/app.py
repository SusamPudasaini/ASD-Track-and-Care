from typing import Optional
import os

from fastapi import FastAPI, HTTPException, Security, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security.api_key import APIKeyHeader
from pydantic import BaseModel, Field

API_KEY = "SusamSecretAndhoMancheleMovieHeryo"
API_KEY_NAME = "X-API-KEY"

app = FastAPI(title="ASD Risk Screening API")

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
    model_version: str = "questionnaire_rules_v2"


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


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": True,
        "model_type": "rule_based_questionnaire_scoring",
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

    probability = questionnaire_risk_score(row)
    probability = round(max(0.01, min(0.95, probability)), 4)

    prediction = 1 if probability >= 0.50 else 0
    risk_level = get_risk_level(probability)

    return PredictResponse(
        asd_probability_score=probability,
        prediction=prediction,
        risk_level=risk_level,
    )
