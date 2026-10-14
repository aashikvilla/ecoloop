"""Firestore Client with Concurrency Transactions and Versioning."""
from typing import Dict, Any, List, Optional
import os
from google.cloud import firestore


class EcoLoopFirestore:
    def __init__(self, project_id: Optional[str] = None):
        self.project_id = project_id or os.getenv("GCP_PROJECT_ID", "project-7eb2c8c6-27da-46d0-827")
        self.db = firestore.Client(project=self.project_id)

    def save_intake_evidence(
        self,
        tenant_id: str,
        evidence_id: str,
        raw_text: str,
        candidates: List[Dict[str, Any]],
        source: str = "receipt_ocr",
    ) -> None:
        """Store uncommitted intake candidate evidence."""
        doc_ref = (
            self.db.collection("tenants")
            .document(tenant_id)
            .collection("evidence")
            .document(evidence_id)
        )
        doc_ref.set({
            "evidence_id": evidence_id,
            "tenant_id": tenant_id,
            "source": source,
            "raw_text": raw_text,
            "candidates": candidates,
            "status": "PENDING_CONFIRMATION",
            "created_at": firestore.SERVER_TIMESTAMP,
        })

    def confirm_inventory_transaction(
        self,
        tenant_id: str,
        evidence_id: str,
        confirmed_items: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Atomically confirm candidate items into verified tenant inventory."""
        transaction = self.db.transaction()
        evidence_ref = (
            self.db.collection("tenants")
            .document(tenant_id)
            .collection("evidence")
            .document(evidence_id)
        )

        @firestore.transactional
        def _execute(txn):
            snapshot = evidence_ref.get(transaction=txn)
            if not snapshot.exists:
                raise ValueError("Evidence record not found.")

            # Update evidence status
            txn.update(evidence_ref, {
                "status": "CONFIRMED",
                "confirmed_at": firestore.SERVER_TIMESTAMP,
            })

            # Upsert into inventory
            for item in confirmed_items:
                item_id = item.get("id") or item["name"].lower().replace(" ", "_")
                inv_ref = (
                    self.db.collection("tenants")
                    .document(tenant_id)
                    .collection("inventory")
                    .document(item_id)
                )
                existing = inv_ref.get(transaction=txn)
                if existing.exists:
                    cur_qty = existing.to_dict().get("quantity", 0.0)
                    new_qty = cur_qty + float(item.get("quantity", 0.0))
                    txn.update(inv_ref, {
                        "quantity": new_qty,
                        "last_updated": firestore.SERVER_TIMESTAMP,
                        "version": firestore.Increment(1),
                    })
                else:
                    txn.set(inv_ref, {
                        "name": item["name"],
                        "category": item.get("category", "Pantry"),
                        "quantity": float(item.get("quantity", 0.0)),
                        "unit": item.get("unit", "count"),
                        "created_at": firestore.SERVER_TIMESTAMP,
                        "version": 1,
                    })

        _execute(transaction)
        return {"status": "SUCCESS", "items_confirmed": len(confirmed_items)}
