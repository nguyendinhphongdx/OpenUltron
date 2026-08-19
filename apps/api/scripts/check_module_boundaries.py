#!/usr/bin/env python3
"""Enforce docs/conventions/01-backend-fastapi.md: "Service không import repository của
module khác — gọi qua service đã export."

Chạy: uv run python scripts/check_module_boundaries.py (từ apps/api/)
Wired vào pre-commit + CI — không dựa vào AI/reviewer nhớ đọc convention mỗi session.
"""

import re
import sys
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent.parent / "app"

# app.modules.<module>[.<submodule>].repository — bắt cả sub-resource như conversation.message
IMPORT_PATTERN = re.compile(r"^from app\.modules\.([\w.]+)\.repository import", re.MULTILINE)


def owning_module(file_path: Path) -> str:
    """Module sở hữu 1 file — path tương đối từ app/modules/, bỏ tên file.

    vd app/modules/conversation/message/service.py -> "conversation.message"
    """
    rel = file_path.relative_to(APP_DIR / "modules")
    return ".".join(rel.parts[:-1])


def find_violations() -> list[str]:
    violations = []
    for file_path in (APP_DIR / "modules").rglob("service.py"):
        own_module = owning_module(file_path)
        text = file_path.read_text()
        for match in IMPORT_PATTERN.finditer(text):
            imported_module = match.group(1)
            if imported_module != own_module:
                line_no = text.count("\n", 0, match.start()) + 1
                violations.append(
                    f"{file_path.relative_to(APP_DIR.parent)}:{line_no} — "
                    f"import repository của module '{imported_module}' trong service của "
                    f"module '{own_module}'. Inject Service của '{imported_module}' thay vì "
                    f"Repository (xem docs/conventions/01-backend-fastapi.md)."
                )
    return violations


def main() -> int:
    violations = find_violations()
    if violations:
        print("Vi phạm module boundary (cross-module repository import):\n")
        for v in violations:
            print(f"  - {v}")
        print(f"\n{len(violations)} vi phạm.")
        return 1
    print("Module boundaries OK — không có service nào import repository của module khác.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
