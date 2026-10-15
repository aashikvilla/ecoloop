# Firestore Versioned State & Concurrency Control

## Versioning Pattern

To maintain an immutable audit trail of what was parsed vs what was confirmed:

1. **Intake Evidence Document** (`tenants/{tenantId}/evidence/{evidenceId}`):
   - Stores raw receipt OCR or voice text.
   - Stores `candidate_items`: Array of items extracted by Gemini.
   - Marked with `status: "PENDING_CONFIRMATION"`.

2. **Confirmation Transaction**:
   - The user inspects candidates on the frontend and makes manual corrections.
   - Calling `POST /v1/facts/confirm` executes a Firestore transaction:
     - Updates `evidence/{evidenceId}` to `status: "CONFIRMED"`.
     - Writes or increments each confirmed item in `tenants/{tenantId}/inventory/{itemId}`.
     - Sets `version: existing_version + 1`.

3. **Composite Indexes**:
   Required indexes in `firestore.indexes.json`:
   ```json
   {
     "indexes": [
       {
         "collectionGroup": "decisions",
         "queryScope": "COLLECTION",
         "fields": [
           { "fieldPath": "tenant_id", "order": "ASCENDING" },
           { "fieldPath": "created_at", "order": "DESCENDING" }
         ]
       }
     ]
   }
   ```
