"""Run one bounded pass over expired private-media objects.

Run from ``backend`` with ``python -m scripts.cleanup_private_media`` after
the normal backend Google credentials/project and ``PRIVATE_MEDIA_BUCKET`` are
configured. This command makes real Firestore and Cloud Storage changes. If
``next_cursor`` is returned, pass it back with ``--cursor`` to continue the
bounded sweep; omit it to begin a new sweep.
"""

from __future__ import annotations

import argparse
import json

from app.domain.private_media import _bucket
from app.domain.private_media_cleanup import (
    DEFAULT_BATCH_SIZE,
    MAX_BATCH_SIZE,
    cleanup_expired_private_media,
)
from app.core.firestore import get_firestore


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--limit",
        type=int,
        default=DEFAULT_BATCH_SIZE,
        help=f"maximum records processed in this pass (1-{MAX_BATCH_SIZE}; default {DEFAULT_BATCH_SIZE})",
    )
    parser.add_argument("--cursor", help="opaque continuation cursor from the previous pass")
    args = parser.parse_args()
    if not 1 <= args.limit <= MAX_BATCH_SIZE:
        parser.error(f"--limit must be between 1 and {MAX_BATCH_SIZE}")
    result = cleanup_expired_private_media(get_firestore(), _bucket(), limit=args.limit, cursor=args.cursor)
    print(json.dumps(result, sort_keys=True))
    return 1 if result["pending"] or result["skipped"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
