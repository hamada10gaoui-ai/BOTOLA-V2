# Security Specification: Firebase Security Rules & TDD Payload Auditing

This document defines the security boundaries, data invariants, and adversarial "Dirty Dozen" payloads to ensure absolute safety, identity integrity, and value-type confinement in our Cloud Firestore database.

---

## 1. Data Invariants

1. **User Identity Invariant**: A user's profile at `/users/{userId}` can only be read or written by the authenticated user whose `request.auth.uid` matches the document's path variable `{userId}`.
2. **Tournament Ownership Invariant**: A tournament document at `/tournaments/{tournamentId}` can only be created or updated if the authenticated requester `request.auth.uid` matches the `ownerId` parameter of the incoming payload.
3. **Public Spectator Read-Only Access**: All users (even anonymous or signed-in/unregistered) can read any tournament with a authenticated ID query or direct get-lookups, allowing real-time public updates on live scores (`LiveFanView`), form streaking, and results.
4. **Temporal Consistency**: Timestamp values `createdAt` (for both Users and Tournaments) and `updatedAt` (for Tournaments) must be aligned strictly with the authoritative server time `request.time`. Payloads carrying client-supplied arbitrary times must be flatly denied.
5. **No Spoofing or Shadow Upgrades**: Changing the `ownerId` of a tournament is forbidden during updates. Changing `email_verified` or identity roles on existing user documents is restricted.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following payloads represent typical pen-testing vectors designed to crash security check gates, escalate privileges, or poison records.

### Payload 1: The Identity Spoof (User Profile)
*   **Vector**: Attempt to write a profile for another user `victim_123` while logged in as `user_auth_456`.
*   **Target**: `/users/victim_123`
*   **Result**: `PERMISSION_DENIED`

### Payload 2: The Self-Elevating Role
*   **Vector**: Attempting to register or update user profile with `role: "admin"` or `isAdmin: true` to hijack supreme admin commands.
*   **Target**: `/users/user_auth_456`
*   **Payload**: `{ "uid": "user_auth_456", "name": "Hacker", "role": "admin", "createdAt": "request.time" }`
*   **Result**: `PERMISSION_DENIED` (role must be either `organizer` or `spectator`)

### Payload 3: The Orphan Tournament
*   **Vector**: Attempting to write a tournament document where the `ownerId` field belongs to another user.
*   **Target**: `/tournaments/tour-xyz`
*   **Payload**: `{ "id": "tour-xyz", "name": "Fake Cup", "organizerName": "Scammer", "ownerId": "victim_123", "drawType": "league", "createdAt": "request.time", "updatedAt": "request.time" }`
*   **Result**: `PERMISSION_DENIED`

### Payload 4: The Anonymous Hijack
*   **Vector**: Attempting to write to a tournament from an unauthenticated session.
*   **Target**: `/tournaments/tour-xyz`
*   **Result**: `PERMISSION_DENIED`

### Payload 5: The Over-Sized ID Poisoning
*   **Vector**: Attempting to poison resources by creating a tournament with a 2 kilobyte junk-string ID.
*   **Target**: `/tournaments/SOME_2KB_EXHAUSTIVE_JUNK_STRING...`
*   **Result**: `PERMISSION_DENIED`

### Payload 6: The Ghost Key Injection (Shadow Update)
*   **Vector**: Attempting to update a tournament's title while slipping in a high-privilege virtual field `isVerifiedByLSSP: true`.
*   **Target**: `/tournaments/tour-123`
*   **Payload**: `{ "name": "New Tournament Name", "isVerifiedByLSSP": true }`
*   **Result**: `PERMISSION_DENIED` (strictly constrained by `affectedKeys().hasOnly()`)

### Payload 7: The Client Timestamp Spoof
*   **Vector**: Setting `createdAt` to a date in 2035 to appear perpetual or historic, cheating temporal filters.
*   **Target**: `/tournaments/tour-123`
*   **Payload**: `{ "createdAt": "2035-12-31T23:59:59Z" }`
*   **Result**: `PERMISSION_DENIED`

### Payload 8: String Value Overflow (Denial of Wallet)
*   **Vector**: Writing a tournament name that is 5 megabytes in size to exhaust host billing quotas on public reads.
*   **Target**: `/tournaments/tour-123`
*   **Payload**: `{ "name": "A..." (5MB long string) }`
*   **Result**: `PERMISSION_DENIED` (strings must be bounded by `.size() <= 200` checks)

### Payload 9: Empty Schema Bypass
*   **Vector**: Bypassing field evaluation by submitting a tournament document that lacks all required fields except ID.
*   **Target**: `/tournaments/tour-empty`
*   **Payload**: `{ "id": "tour-empty" }`
*   **Result**: `PERMISSION_DENIED`

### Payload 10: Owner Overwriting (Host Takeover)
*   **Vector**: A separate organizer tries to update a victim's tournament to set `ownerId: "attacker_456"`.
*   **Target**: `/tournaments/tour-123`
*   **Result**: `PERMISSION_DENIED` (strictly forbids changing `ownerId`)

### Payload 11: The Spoof Email Verification Bypass
*   **Vector**: Attempting to perform edits with a fake unverified session.
*   **Target**: `/tournaments/tour-123`
*   **Result**: `PERMISSION_DENIED`

### Payload 12: Invalid Nested Types (Value Poisoning)
*   **Vector**: Attempting to pollute the database by writing a boolean or number inside fields configured to accept clean structure strings or arrays.
*   **Target**: `/tournaments/tour-123`
*   **Result**: `PERMISSION_DENIED`

---

## 3. The Test Runner Configuration

A test pipeline using `@firebase/rules-unit-testing` or manual mock request assertions ensures zero leaks:

```typescript
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

describe("Firestore Security Rules Hardening Audit", () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "regal-mariner-4szp9",
      firestore: {
        host: "localhost",
        port: 8080,
      }
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  test("Pillar 1/2/3: Should deny writing profile for a different user", async () => {
    const maliciousContext = testEnv.authenticatedContext("user_auth_456");
    const db = maliciousContext.firestore();
    const ref = doc(db, "users", "victim_123");
    
    await expect(setDoc(ref, {
      uid: "victim_123",
      name: "Victim",
      email: "victim@domain.com",
      role: "organizer"
    })).rejects.toThrow("PERMISSION_DENIED");
  });

  test("Pillar 2/3: Should deny registering with admin system claims", async () => {
    const context = testEnv.authenticatedContext("user_auth_456");
    const db = context.firestore();
    const ref = doc(db, "users", "user_auth_456");
    
    await expect(setDoc(ref, {
      uid: "user_auth_456",
      name: "Hacker User",
      email: "hacker@domain.com",
      role: "admin", // Invalid enum role
      createdAt: new Date()
    })).rejects.toThrow("PERMISSION_DENIED");
  });

  test("Pillar 4/5: Should deny modifying a tournament owned by another user", async () => {
    const context = testEnv.authenticatedContext("attacker_711");
    const db = context.firestore();
    const ref = doc(db, "tournaments", "victim_tour_888");
    
    await expect(updateDoc(ref, {
      name: "Hijacked Tournament Title"
    })).rejects.toThrow("PERMISSION_DENIED");
  });
});
```
