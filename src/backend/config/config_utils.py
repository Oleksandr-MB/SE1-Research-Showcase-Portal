from pathlib import Path
import yaml

def read_config(name: str):
    config_dir = Path(__file__).resolve().parent
    cfg_path = config_dir / f"{name}.yaml"

    with open(cfg_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)
