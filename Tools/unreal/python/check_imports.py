from __future__ import annotations

import ast
import sys
from pathlib import Path


def collect_imports(path: Path) -> tuple[list[str], list[str]]:
    module_imports: list[str] = []
    parse_errors: list[str] = []
    try:
        tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    except Exception as exc:
        parse_errors.append(f"{path}: parse error: {exc}")
        return module_imports, parse_errors

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                module_imports.append(alias.name.split(".")[0])
        elif isinstance(node, ast.ImportFrom) and node.module:
            module_imports.append(node.module.split(".")[0])
    return sorted(set(module_imports)), parse_errors


def main() -> int:
    root = Path(__file__).resolve().parent
    scripts = sorted(root.glob("*.py"))
    failures: list[str] = []

    for script in scripts:
        imports, parse_errors = collect_imports(script)
        failures.extend(parse_errors)
        if parse_errors:
            continue

        unresolved = []
        for module in imports:
            if module == "unreal":
                continue
            try:
                __import__(module)
            except Exception:
                unresolved.append(module)

        status = "ok"
        if unresolved:
            status = "missing imports: " + ", ".join(unresolved)
        print(f"{script.name}: {status}")

    if failures:
        for failure in failures:
            print(failure, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
