# ASD Track & Care

ASD Track & Care is a full-stack final year project focused on autism support services, screening, parent guidance, and therapist workflows.

The system contains three connected applications:
- React frontend for user interface and role-based pages.
- Spring Boot backend for authentication, business logic, persistence, and integrations.
- FastAPI AI model service for ASD risk scoring from questionnaire inputs.

## Project Structure

- Frontend/ -> React + Vite client
- backend/ -> Spring Boot API and core business services
- Ai-Model/ -> FastAPI model service
- uploads/ -> stored files (profile pictures, therapist application docs) 

## Core Features

- Authentication, email verification, and password reset.
- Therapist application workflow and admin review flow.
- Daycare finder, reviews, and admin daycare management.
- Resource hub and admin resource management.
- AAC cards and First-Then board support.
- Matching and sorting activities and activity analytics.
- M-CHAT questionnaire and analytics.
- ML screening endpoint bridge from Spring Boot to FastAPI.
- Khalti payment integration.

## Tech Stack

- Frontend: React 19, Vite, Tailwind CSS, Axios, React Router.
- Backend: Spring Boot, Spring Security, Spring Data JPA, MySQL, JWT, Springdoc OpenAPI.
- AI Model: FastAPI + Pydantic rule-based ASD scoring API.

## Default Local Ports

- Frontend: http://localhost:5173
- Backend: http://localhost:8081
- FastAPI model: http://localhost:8000

## Prerequisites

- Node.js 18+
- npm 9+
- Java 21
- Python 3.10+
- MySQL 8+

## Setup and Run (Local)

Run services in this order: FastAPI -> Spring Boot -> React.

### 1) Database Setup

Create a MySQL database named ASD.

Update backend configuration in backend/src/main/resources/application.properties:
- spring.datasource.url
- spring.datasource.username
- spring.datasource.password (add this if required in your local MySQL)
- jwt.secret
- fastapi.url
- fastapi.api-key
- spring.mail.*
- khalti.*
- elevenlabs.*

Important: move all real secrets to environment variables or local-only config files before sharing or deploying.

### 2) Run FastAPI Model Service

From Ai-Model:

pip install fastapi "uvicorn[standard]" pydantic
uvicorn app:app --host 0.0.0.0 --port 8000 --reload

Health check:
- GET http://localhost:8000/health

Model docs:
- http://localhost:8000/docs

### 3) Run Spring Boot Backend

From backend:

Windows:
mvnw.cmd spring-boot:run

Mac/Linux:
./mvnw spring-boot:run

Swagger UI:
- http://localhost:8081/swagger-ui/index.html

OpenAPI JSON:
- http://localhost:8081/v3/api-docs

### 4) Run React Frontend

From Frontend:

npm install
npm run dev

Set Frontend/.env:

VITE_API_BASE_URL=http://localhost:8081

## Service Integration Notes

- Frontend calls backend using VITE_API_BASE_URL.
- Backend calls FastAPI using fastapi.url and secures the call using fastapi.api-key.
- FastAPI predict endpoint expects header X-API-KEY.

## Backend API Modules (High Level)

- /auth
- /api/users
- /api/therapists
- /api/therapist-applications
- /api/admin/therapist-applications
- /api/daycares
- /api/admin/daycares
- /api/bookings
- /api/resources
- /api/admin/resources
- /api/aac
- /api/admin/aac-cards
- /api/first-then
- /api/matching-sorting
- /api/admin/matching-sorting
- /api/activities/results
- /api/analytics
- /api/mchat-questionnaire
- /api/analytics/mchat-questionnaire
- /api/admin/mchat-questions
- /api/ml

## CORS and Frontend URL

Backend security config currently allows localhost origins and uses app.frontend.base-url for email verification and reset links.

If frontend URL changes, update:
- app.frontend.base-url in backend/src/main/resources/application.properties
- VITE_API_BASE_URL in Frontend/.env

## Troubleshooting

- Backend fails on startup: verify MySQL is running and database ASD exists.
- 401 from FastAPI /predict: check fastapi.api-key matches Ai-Model/app.py API key.
- Frontend API errors: verify VITE_API_BASE_URL points to backend port 8081.
- Email links incorrect: confirm app.frontend.base-url.

## Final Note

This is a Final Year Project by Susam Pudasaini.
