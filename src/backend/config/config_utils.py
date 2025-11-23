import yaml

def read_config(name: str):
    with open(f"src/backend/config/{name}.yaml", "r") as f:
        return yaml.safe_load(f)
