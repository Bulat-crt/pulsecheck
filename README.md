# PulseCheck

**A lightweight website availability monitoring service built with FastAPI, PostgreSQL, and Docker Compose.**

PulseCheck monitors websites by sending HTTP requests, measuring response times, recording HTTP status codes, and storing a history of checks. It provides a REST API for managing URLs and reviewing their monitoring history, while a background worker periodically checks active websites automatically.

## Features

- **URL Management** — add, list, retrieve, and delete monitored URLs.
- **HTTP Monitoring** — check website availability and record HTTP status codes.
- **Response Time Tracking** — measure HTTP response times in milliseconds.
- **Check History** — store and retrieve historical monitoring results for each URL.
- **Automatic Monitoring** — a background worker periodically checks active URLs.
- **Failure Handling** — handle network errors, timeouts, and unsuccessful HTTP responses.
- **Database Migrations** — manage database schema changes with Alembic.
- **Automated Tests** — test API endpoints and monitoring behavior with pytest.
- **Containerization** — run the API, PostgreSQL, and worker using Docker Compose.

## Tech Stack

- **Python 3.13**
- **FastAPI** — REST API
- **SQLAlchemy** — ORM and database access
- **PostgreSQL** — persistent data storage
- **Alembic** — database migrations
- **Pydantic** — request validation and response schemas
- **HTTPX** — HTTP requests and response-time measurement
- **pytest** — automated testing
- **Docker & Docker Compose** — containerization and service orchestration
- **HTML, CSS, and Vanilla JavaScript** — frontend

## Architecture

```text
PulseCheck
│
├── FastAPI
│   ├── Routes
│   ├── Services
│   └── Repositories
│
├── PostgreSQL
│   ├── URLs
│   └── URL Check History
│
├── Worker
│   └── Periodic URL Monitoring
│
└── Frontend
    ├── HTML
    ├── CSS
    └── JavaScript
```

The application follows a layered architecture:

- **Routes** handle HTTP requests, responses, and status codes.
- **Services** implement business logic and coordinate operations.
- **Repositories** handle database queries and persistence.
- **SQLAlchemy models** define the database structure.
- **Pydantic schemas** validate input and define API responses.
- **The worker** periodically checks active URLs and stores the results.

## Data Models

### URL

Stores information about a monitored website.

| Field | Description |
|---|---|
| `id` | Unique identifier |
| `url` | Website URL |
| `created_at` | Creation timestamp |
| `is_active` | Whether automatic monitoring is enabled |

### URLCheck

Stores the result of a single monitoring attempt.

| Field | Description |
|---|---|
| `id` | Unique identifier |
| `url_id` | Reference to the monitored URL |
| `status_code` | HTTP status code, or `null` when no HTTP response was received |
| `response_time` | Request duration in milliseconds |
| `success` | Whether the HTTP check was successful |
| `checked_at` | Timestamp of the check |

An HTTP status code from `200` through `399` is considered successful. Network failures and timeouts are recorded as unsuccessful checks.

## API Endpoints

The interactive API documentation is available at `/docs` when the application is running.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/urls` | Add a URL to monitor |
| `GET` | `/urls` | Retrieve all monitored URLs |
| `GET` | `/urls/{url_id}` | Retrieve a URL by ID |
| `DELETE` | `/urls/{url_id}` | Delete a URL |
| `POST` | `/urls/{url_id}/check` | Run a check manually |
| `GET` | `/urls/{url_id}/checks` | Retrieve check history |

### Example: Add a URL

Request:

```http
POST /urls
Content-Type: application/json
```

```json
{
  "url": "https://github.com"
}
```

Example response:

```json
{
  "id": 1,
  "url": "https://github.com/",
  "created_at": "2026-10-01T12:00:00",
  "is_active": true
}
```

The exact ID and timestamp depend on the database state.

### Example: Run a Check

```http
POST /urls/1/check
```

Example response:

```json
{
  "id": 1,
  "url_id": 1,
  "status_code": 200,
  "response_time": 123.45,
  "success": true,
  "checked_at": "2026-10-01T12:00:01"
}
```

### HTTP Status Codes

The API uses conventional HTTP status codes, including:

- `200 OK` — successful request.
- `404 Not Found` — requested URL does not exist.
- `409 Conflict` — a duplicate URL cannot be created.
- `422 Unprocessable Entity` — request validation failed.
- `500 Internal Server Error` — unexpected server-side failure.

## Requirements

To run the project locally, you need:

- Python 3.13
- PostgreSQL
- Git

To run the containerized version, you need Docker Desktop or Docker Engine with the Docker Compose plugin.

## Configuration

Create a `.env` file in the project root. Keep this file out of version control.

Example configuration:

```env
POSTGRES_DB=learning
POSTGRES_USER=bulat
POSTGRES_PASSWORD=change_me

DATABASE_URL=postgresql+psycopg2://bulat:change_me@localhost:5432/learning
TEST_DATABASE_URL=postgresql+psycopg2://bulat:change_me@localhost:5432/learning_test
```

Replace the example credentials with your own values.

The application uses `DATABASE_URL` to connect to PostgreSQL. `TEST_DATABASE_URL` points to a separate database for automated tests.

When running through Docker Compose, the API connects to PostgreSQL using the Compose service name rather than `localhost`.

## Running Locally

### 1. Clone the repository

```bash
git clone <https://github.com/Bulat-crt>
cd pulsecheck
```

### 2. Create and activate a virtual environment

On macOS or Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Create the PostgreSQL databases

Make sure PostgreSQL is running, then create the application and test databases:

```bash
createdb -U bulat learning
createdb -U bulat learning_test
```

If either database already exists, you do not need to create it again.

### 5. Apply migrations

From the project root:

```bash
alembic upgrade head
```

### 6. Start the API

```bash
uvicorn main:app --reload
```

Open the interactive documentation:

```text
http://localhost:8000/docs
```

### 7. Run the worker

In a separate terminal, with the virtual environment activated:

```bash
python -m app.worker
```

The worker periodically checks active URLs and saves the results to PostgreSQL.

## Running with Docker Compose

Make sure your `.env` contains the PostgreSQL configuration values required by `compose.yaml`.

Build the image and start the services:

```bash
docker compose up -d --build
```

The application consists of three services:

- `api` — FastAPI application.
- `postgres` — PostgreSQL database.
- `worker` — background URL monitoring.

Apply database migrations inside the API container:

```bash
docker compose exec api alembic upgrade head
```

Check the service status:

```bash
docker compose ps
```

View logs:

```bash
docker compose logs -f api
docker compose logs -f worker
docker compose logs -f postgres
```

Open the API documentation:

```text
http://localhost:8000/docs
```

PostgreSQL data is stored in a named Docker volume so that the data persists when containers are recreated. Avoid using `docker compose down -v` unless you intentionally want to delete the volume and its stored database data.

## Running Tests

Make sure `TEST_DATABASE_URL` points to a separate PostgreSQL database that is safe to reset during testing.

Run the test suite from the project root:

```bash
python -m pytest
```

Tests cover URL management, duplicate handling, missing resources, HTTP checks, and check history. HTTP requests can be mocked so that tests do not depend on external websites or internet availability.

## Project Goals

PulseCheck was developed as a practical learning project to explore:

- REST API design with FastAPI.
- Separation of routes, services, and repositories.
- SQLAlchemy ORM and relational database relationships.
- Schema migrations with Alembic.
- Automated testing with pytest.
- HTTP monitoring and error handling.
- Docker images, containers, networks, volumes, and Compose.
- Running an API and background worker alongside PostgreSQL.

The project focuses on a small, understandable architecture rather than introducing unnecessary infrastructure or dependencies.