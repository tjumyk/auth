# Intercept flows test matrix

| User state | Entry point | Expected destination | Coverage |
|------------|-------------|----------------------|----------|
| IP blocked | Home click locked app | Target `home_url` | L1, L2 (auth), manual |
| IP allowed | Home click app | Target `home_url` | L1, L2 |
| Password expiry intercept | Home click app | Auth `/account/password-expiry?intent_client_id=` | L1, L2 |
| Password expiry + IP blocked, skip | Expiry page skip | Target `home_url` | L1, L2 |
| IP blocked | Gate banner CTA | Gate home `/` | L1, manual |
| Already allowed | Grant-access URL | Auto redirect target `home_url` | L2 (gate), manual |
| Cold gate session | Grant-access URL | OAuth then same grant-access URL | manual |
| Too many rules | Grant-access confirm | Inline error + manage rules link | L2 (gate), manual |

Legend: **L1** = pure navigation unit tests, **L2** = MSW page tests, **L3** = backend API mocks, **manual** = developer walkthrough.

## Dev preview

- Auth home: `/?dev_ip_blocked=1` forces lock icons (dev builds only).
- Gate grant-access API: enable `DEV_SCENARIO_OVERRIDES` in gate `config.json`, then `/api/access-intent?client_id=N&dev_access_allowed=0|1`.
