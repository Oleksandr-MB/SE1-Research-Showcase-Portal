import yaml

def read_config(name: str):
    with open(f"/Users/yaroslav/Downloads/SE1-Research-Showcase-Portal-main/src/backend/config/{name}.yaml", "r") as f:
        return yaml.safe_load(f)
