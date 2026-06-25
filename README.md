# Prediction API

A Node.js and Express REST API implementing the Prediction endpoints of the MTN USSD Services spec, with JWT authentication and mocked data.

**Live URL:** https://prediction-api-jdkd.onrender.com

> The API is hosted on a free tier that sleeps after inactivity. The first request after a period of idle may take up to a minute to respond while the server wakes up. User accounts are stored in memory and are reset whenever the server restarts.

---

## Local Setup

```bash
npm install
npm run dev
```

The server runs on port 4000 by default.

---

## Authentication Flow

1. Create a user account with `POST /api/prediction/create/user/`.
2. Log in with `POST /api/prediction/login/user/` to receive a JWT token.
3. Include the token as a Bearer header on all protected endpoints:
   ```
   Authorization: Bearer <your_token>
   ```

---

## Endpoints

### Account Endpoints

**POST /api/prediction/create/user/**
- JWT required: No
- Body: `number`, `pin`, `confirm_pin`
- Creates a new user account. `pin` and `confirm_pin` must match.

**POST /api/prediction/login/user/**
- JWT required: No
- Body: `number`, `pin`
- Authenticates the user and returns a JWT token valid for 7 days.

**POST /api/prediction/change/password/**
- JWT required: Yes
- Body: `old_pin`, `new_pin`
- Changes the PIN for the currently authenticated user.

**POST /api/prediction/forgot/password/**
- JWT required: No
- Body: `phone_number`
- Returns a 6-digit reset code if the number exists in the system.

**POST /api/prediction/reset/password/**
- JWT required: No
- Body: `phone_number`, `pin`
- Sets a new PIN for the account associated with the given phone number.

**POST /api/prediction/update/password/**
- JWT required: No
- Body: `number`, `pin`, `confirm_pin`
- Updates the PIN for the given number. `pin` and `confirm_pin` must match.

---

### Prediction Data Endpoints

All prediction data endpoints support optional query parameters: `page` (default 1), `page_size` (default 10), and `search` (filters by team name).

**GET /api/prediction/general/**
- JWT required: No
- Query params: `search` (optional), `page` (optional), `page_size` (optional)
- Returns a paginated list of general predictions. Response shape: `{ items, count }`.

**GET /api/prediction/general/today/**
- JWT required: Yes
- Query params: `search` (optional), `page` (optional), `page_size` (optional)
- Returns predictions for today only, with a reduced field set: `game_id`, `home_team`, `away_team`, `prediction`, `is_finished`, `date`, `date_created`, `date_time`, `prediction_probability`.

**GET /api/prediction/general/vip/**
- JWT required: Yes
- Query params: `search` (optional, matches `home_name`, `away_name`, or `competition_name`), `page` (optional), `page_size` (optional)
- Returns VIP predictions. Response shape: `{ items, count }`.

**GET /api/prediction/accumulator/**
- JWT required: Yes
- Query params: `search` (optional, matches `home_name`, `away_name`, or `competition_name`), `page` (optional), `page_size` (optional)
- Returns accumulator bet selections. Response shape: `{ items, count }`.

**GET /api/prediction/bet_of_day/**
- JWT required: Yes
- No parameters.
- Returns the single bet of the day. Response shape: `{ message, data }`.

---

## How to Test

A quick ordered example using any HTTP client:

1. Create a user:
   ```
   POST /api/prediction/create/user/
   Body: { "number": "08012345678", "pin": "1234", "confirm_pin": "1234" }
   ```

2. Log in to get a token:
   ```
   POST /api/prediction/login/user/
   Body: { "number": "08012345678", "pin": "1234" }
   ```
   Copy the `token` value from the response.

3. Call the today endpoint with the token:
   ```
   GET /api/prediction/general/today/
   Authorization: Bearer <token>
   ```

---

## Notes and Limitations

- All prediction data is mocked and stored in memory. There is no database.
- User accounts are also in-memory and are lost on every server restart.
- A production version of this API would use a persistent database and a securely configured JWT secret stored in environment variables, not a hardcoded fallback.
