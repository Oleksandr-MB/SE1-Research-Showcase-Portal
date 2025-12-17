import yaml
import os
def read_config(name: str):
    with open(f"/Users/yaroslav/Documents/Work/For Git Project /SE1-Research-Showcase-Portal/src/backend/config/{name}.yaml", "r") as f:
        return yaml.safe_load(f)
