import unreal


def dump_bridge(name: str, bridge_type: object) -> None:
    print(f"=== {name} ===")
    for attr in sorted(dir(bridge_type)):
        if not attr.startswith("_"):
            print(attr)
    print("")


def main() -> None:
    dump_bridge("WidgetTreePythonBridge", unreal.WidgetTreePythonBridge)
    dump_bridge("BlueprintGraphPythonBridge", unreal.BlueprintGraphPythonBridge)


if __name__ == "__main__":
    main()
