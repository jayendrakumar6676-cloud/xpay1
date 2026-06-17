# Test Credentials

## Candidate Login (Mock auth — no real backend validation)
- **Username**: any non-empty string (e.g. `kodi himavanth`)
- **Access Code**: any 4+ character string (e.g. `1234`)

The username is stored in sessionStorage and used as the display label
(`Mr. <username>`) and to slugify the storage identifier
(`{slug}@xpay.local`). No backend account lookup occurs.

## Invigilator Dashboard
- **URL**: `/submissions`
- **PIN**: `xpay-2026`
