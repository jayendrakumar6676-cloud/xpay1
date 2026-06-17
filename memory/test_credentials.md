# Test Credentials

## Candidate Login (validated against an allow-list)
| Username                       | Password    | Display Name      |
|--------------------------------|-------------|-------------------|
| `himavanthkodi@gmail.com`      | `20041007`  | Himavanth Kodi    |
| `h1`                           | `h2`        | Test User         |

Any other username/password combination is rejected with
"Invalid username or password.".

The username match is case-insensitive (trimmed); the password
must match exactly. Credentials live in `/app/src/lib/credentials.ts`.

## Invigilator Dashboard
- **URL**: `/submissions`
- **PIN**: `xpay-admin-2026`  *(updated 17 Jun 2026 — previous was `xpay-2026`)*

## Schedule Gate
Exams are only enterable inside their scheduled window
(`startAt`–`endAt` in IST, +05:30). Outside that window the runner
shows a live countdown card and refuses to start.

| Exam      | Round | Start (IST)             | End (IST)               |
|-----------|-------|-------------------------|-------------------------|
| Aptitude  | 1     | 2026-06-18 09:00        | 2026-06-18 11:00        |
| DSA       | 2     | 2026-06-18 14:00        | 2026-06-18 17:00        |
| Coding    | 3     | 2026-06-18 18:00        | 2026-06-18 20:30        |
| Technical | 4     | 2026-06-19 14:00        | 2026-06-19 15:30        |
| System    | 5     | 2026-06-19 20:00        | 2026-06-19 21:30        |

To exercise the runner during automated testing without waiting for the
scheduled window, override the system clock (e.g. with `Date.now`
monkey-patching from Playwright) so it falls inside the window above.
