# Shared requirements and acceptance criteria (Tasks 01–02)

One sheet for **both** solutions: the code-based app (`src/contract/`, React UI) and the low-code app (Appsmith, `lowcode/appsmith/`).

## Baseline (Task 01)

| Item | Value |
|---|---|
| Starting point | Practice #11 final version, commit `ff67c37` (branch `main` of the previous repository) |
| Baseline checks | 65 tests pass, typecheck / lint / build pass ([baseline-output.txt](baseline/baseline-output.txt)) |
| Baseline screenshot | [00-baseline-practice11.png](screenshots/00-baseline-practice11.png) |
| Booking rules | `src/utils.ts` – start after "now", at most 120 minutes, blocked room unavailable, overlap unavailable, touching ends allowed. **Not changed.** |

The Lesson 12 contract reuses those rules (`overlaps`, `MAX_DURATION`, `labelToMinutes` are imported from `src/utils.ts`). Nothing was changed to make one platform look better.

## User story

> As a **student**, I want to choose a **future start time** and a **duration** for the seminar room, so that I immediately see whether the room is **Available** or **Unavailable** and **why**, without changing anybody's booking.

## Acceptance criteria

| ID | Criterion | Reason code(s) |
|---|---|---|
| AC1 | Start time must be in the future (strictly after the simulated current time). | `START_IN_PAST` |
| AC2 | Duration must be greater than 0 and at most 120 minutes (whole minutes). | `INVALID_DURATION` |
| AC3 | An interval that overlaps an existing booking is **Unavailable**. Touching ends (11:30 after a booking that ends at 11:30) do not overlap. | `OVERLAP` |
| AC4 | A blocked room is **Unavailable**. | `ROOM_BLOCKED` |
| AC5 | The decision is shown clearly, and the list of existing bookings is never changed. | all |
| AC6 | Invalid input gets an understandable message (no crash, no raw error, the input is not echoed back). | `INVALID_*`, `START_IN_PAST`, `ENDS_AFTER_MIDNIGHT` |

## Contract

**Inputs**

| Input | Type | Example | Notes |
|---|---|---|---|
| `startTime` | text `HH:MM` | `12:00` | 24-hour clock, one day |
| `durationMinutes` | text or number, digits only | `60` | `6e1`, `60.5`, `-5`, empty are invalid |
| `blocked` | boolean | `false` | "Room blocked (maintenance)" switch |
| `now` | text `HH:MM` | `09:30` | **simulated** current time, so every test run gives the same result |
| `bookings` | fixed list | see below | read-only, frozen |

**Outputs**

| Output | Type | Example |
|---|---|---|
| `available` | boolean | `false` |
| `reasonCode` | enum | `OVERLAP` |
| `message` | text shown to the student | `Overlaps with "Thesis Defense" (10:00–11:30).` |
| `status` | `AVAILABLE` / `UNAVAILABLE` / `INVALID_INPUT` | `UNAVAILABLE` |

**Rule order** (both solutions): `INVALID_NOW` → `INVALID_START` → `INVALID_DURATION` → `START_IN_PAST` → `ENDS_AFTER_MIDNIGHT` → `ROOM_BLOCKED` → `INVALID_BOOKING_DATA` → `OVERLAP` → `AVAILABLE`. The first failed rule wins.

## Fictional data (same in both solutions)

Room: **Seminar Room 7**, South Wing, 20 seats (fictional).

| ID | Title | Start | End |
|---|---|---|---|
| B1 | Morning Lecture | 08:00 | 09:00 |
| B2 | Thesis Defense | 10:00 | 11:30 |
| B3 | Workshop | 15:00 | 16:00 |

Fingerprint of this list (shown in both UIs, used for T8): `3 bookings · #c36cc934`.

Files: [`src/contract/data.ts`](../../src/contract/data.ts), [`lowcode/appsmith/bookings.json`](../../lowcode/appsmith/bookings.json), and the `bookings` property of [`lowcode/appsmith/RoomCheck.js`](../../lowcode/appsmith/RoomCheck.js). A test checks that all three are identical.

## Common test inputs (prepared before implementation)

Simulated now = `09:30` for every case.

| Test | Start | Duration | Blocked | Expected status | Expected reason |
|---|---|---|---|---|---|
| T1 valid free interval | 12:00 | 60 | no | AVAILABLE | `AVAILABLE` |
| T2 overlap | 11:00 | 60 | no | UNAVAILABLE | `OVERLAP` (B2) |
| T3 blocked room | 12:00 | 60 | yes | UNAVAILABLE | `ROOM_BLOCKED` |
| T4 duration 0 | 12:00 | 0 | no | INVALID_INPUT | `INVALID_DURATION` |
| T5 duration 121 | 12:00 | 121 | no | INVALID_INPUT | `INVALID_DURATION` |
| T6 past start | 09:00 | 30 | no | INVALID_INPUT | `START_IN_PAST` |
| T7 adjacent | 11:30 | 60 | no | AVAILABLE | `AVAILABLE` |
| T8 data unchanged | – | – | – | fingerprint before = after | – |
