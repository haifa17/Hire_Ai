# AI Service - TalentBridge AI

Microservice Python (FastAPI) pour la generation de CV ATS-friendly, le matching CV/job offer, l'explication du score et l'audit biais/GDPR.

## Objectif

Ce service:

- recoit le profil candidat + la job description + la langue (`EN` ou `FR`)
- appelle un provider IA configurable (`Groq` ou `Ollama`)
- genere un CV structure en JSON, optimise ATS
- renvoie le contenu au backend NestJS
- calcule aussi un score de matching candidat/job offer avec explication et audit

## Stack

- Python 3.10+
- FastAPI
- Uvicorn
- Requests
- Groq API (recommande)
- Ollama (optionnel, local)

## Structure

- `main.py`: API FastAPI + routes ATS, job offers et matching
- `app/orchestrator/graph.py`: orchestration du pipeline de matching
- `app/agents/matching/`: extraction, structuration, normalisation, embeddings, scoring, explication et audit
- `requirements.txt`: dependances Python

## Prerequis

1. Python installe
2. Une cle API Groq (recommande) ou Ollama local actif
3. Si Ollama: un modele local telecharge

Exemples de modeles:

- Groq: `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`
- Ollama: `qwen2.5:14b`, `llama3.1:8b`, `mistral`

## Installation

Depuis `backend/ai-service`:

```bash
python -m venv .venv
```

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Git Bash:

```bash
source .venv/Scripts/activate
pip install -r requirements.txt
```

## Configuration

Le service est maintenant configure via variables d'environnement.

1. Copier le fichier exemple:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

2. Ajuster les variables dans `.env`:

- `AI_SERVICE_NAME`
- `AI_SERVICE_HOST`
- `AI_SERVICE_PORT`
- `AI_PROVIDER` (`groq` ou `ollama`)
- `GROQ_API_KEY`
- `GROQ_MODEL`
- `GROQ_URL`
- `GROQ_TIMEOUT_SECONDS`
- `OLLAMA_URL`
- `OLLAMA_MODEL`
- `OLLAMA_TIMEOUT_SECONDS`
- `EMBEDDING_DIMENSIONS`
- `MATCHING_SKILL_WEIGHT`
- `MATCHING_PREFERRED_SKILL_WEIGHT`
- `MATCHING_EXPERIENCE_WEIGHT`
- `MATCHING_TITLE_WEIGHT`
- `MATCHING_LOCATION_WEIGHT`
- `MATCHING_LANGUAGE_WEIGHT`
- `MATCHING_EDUCATION_WEIGHT`
- `MATCHING_EMBEDDING_WEIGHT`
- `MATCHING_BIAS_PENALTY`

Exemple:

```env
AI_SERVICE_NAME="TalentBridge AI Service"
AI_SERVICE_HOST=0.0.0.0
AI_SERVICE_PORT=8000
AI_PROVIDER=groq
GROQ_API_KEY=<YOUR_GROQ_API_KEY>
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_URL=https://api.groq.com/openai/v1/chat/completions
GROQ_TIMEOUT_SECONDS=120
OLLAMA_URL=http://localhost:11434/api/generate
OLLAMA_MODEL=qwen2.5:14b
OLLAMA_TIMEOUT_SECONDS=300
EMBEDDING_DIMENSIONS=384
MATCHING_SKILL_WEIGHT=0.28
MATCHING_PREFERRED_SKILL_WEIGHT=0.08
MATCHING_EXPERIENCE_WEIGHT=0.22
MATCHING_TITLE_WEIGHT=0.12
MATCHING_LOCATION_WEIGHT=0.08
MATCHING_LANGUAGE_WEIGHT=0.06
MATCHING_EDUCATION_WEIGHT=0.08
MATCHING_EMBEDDING_WEIGHT=0.08
MATCHING_BIAS_PENALTY=5
```

## Lancer le service

Depuis `backend/ai-service`:

```bash
python main.py
```

Le service expose:

- Base URL: `http://localhost:8000`
- Endpoint principal: `POST /api/ai/generate-resume`
- Endpoint job offers: `POST /api/ai/generate-job-offer`
- Endpoint matching: `POST /api/ai/matching/run`
- Endpoint ranking: `POST /api/ai/matching/search`

## Contrat API

### Request

```json
{
  "profile": {
    "firstName": "Nour",
    "lastName": "Doe",
    "email": "nour@example.com",
    "phone": "+212600000000",
    "professionalSummary": "Full-stack engineer...",
    "experiences": [],
    "education": [],
    "skills": ["NestJS", "React"],
    "languages": ["FR", "EN"],
    "projects": [],
    "certifications": []
  },
  "jobDescription": "We are looking for...",
  "language": "EN"
}
```

### Response (succes)

```json
{
  "success": true,
  "message": "Resume generated successfully",
  "data": {
    "requestId": "uuid",
    "provider": "groq",
    "model": "llama-3.3-70b-versatile",
    "content": {
      "personalInfo": {
        "name": "...",
        "email": "...",
        "phone": "..."
      },
      "professionalSummary": "...",
      "skills": ["..."],
      "experience": [
        {
          "title": "...",
          "company": "...",
          "dates": "...",
          "achievements": ["..."]
        }
      ],
      "education": [
        {
          "degree": "...",
          "institution": "...",
          "dates": "..."
        }
      ]
    }
  }
}
```

Si le modele ne retourne pas un JSON valide, fallback actuel:

```json
{
  "success": true,
  "message": "Resume generated successfully",
  "data": {
    "requestId": "uuid",
    "model": "llama-3.3-70b-versatile",
    "content": {
      "rawMarkdown": "..."
    }
  }
}
```

### Response erreur standardisee

```json
{
  "success": false,
  "error": {
    "code": "GROQ_UNAVAILABLE",
    "message": "Groq API is unavailable",
    "details": "..."
  }
}
```

## Test rapide avec curl

```bash
curl -X POST "http://localhost:8000/api/ai/generate-resume" \
  -H "Content-Type: application/json" \
  -d '{
    "profile": {
      "firstName": "Nour",
      "lastName": "Doe",
      "email": "nour@example.com",
      "skills": ["Python", "FastAPI", "NestJS"]
    },
    "jobDescription": "Backend engineer with FastAPI and cloud experience",
    "language": "EN"
  }'
```

## Timeout et performance

- Le timeout Groq est configure via `GROQ_TIMEOUT_SECONDS`
- Le timeout Ollama est configure via `OLLAMA_TIMEOUT_SECONDS`
- Les modeles locaux avec grande context window peuvent etre lents
- Recommande:
  - garder le service IA dedie
  - monitorer les temps de reponse
  - si Ollama: utiliser un modele adapte a votre machine (RAM/VRAM)

## Integration backend/frontend

Le backend NestJS appelle:

- URL: `AI_SERVICE_URL + /api/ai/generate-resume`
- timeout HTTP cote NestJS: `AI_SERVICE_TIMEOUT_MS` (par defaut 300000)
- extraction du contenu IA: `response.data.data.content`

Pour les job offers, le backend appelle:

- URL: `AI_SERVICE_URL + /api/ai/generate-job-offer`
- contrat de sortie: `content` contient le draft structuré de pre-remplissage

Le frontend Next.js est connecte au backend via:

- base URL: `NEXT_PUBLIC_API_URL`
- endpoint generation: `POST /api/v1/resumes/generate`
- timeout frontend generation: 310000 ms
- gestion des erreurs unifiee depuis `message` / `error.message`

Ordre de demarrage recommande:

1. Configurer `.env` avec `AI_PROVIDER=groq` + `GROQ_API_KEY`
2. Lancer le service IA (`python main.py`)
3. Lancer le backend NestJS
4. Lancer le frontend Next.js

Pour utiliser Ollama a la place:

1. Mettre `AI_PROVIDER=ollama`
2. Verifier `OLLAMA_URL` et `OLLAMA_MODEL`
3. Lancer Ollama local avant de generer un CV

Assurez-vous que:

1. Si Groq: la cle API est valide
2. Si Ollama: Ollama tourne et le modele est telecharge
3. Le service Python est lance avant la generation de CV

## Pistes d'amelioration

- Ajouter retry/backoff si Ollama est temporairement indisponible
- Ajouter des tests unitaires FastAPI
- Ajouter une file de jobs (RQ/Celery) si volume important
