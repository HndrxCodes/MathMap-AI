import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

NEBIUS_API_KEY = os.getenv("NEBIUS_API_KEY")

nebius_client = OpenAI(
    base_url="https://api.tokenfactory.nebius.com/v1/",
    api_key=NEBIUS_API_KEY,
)

ORCHESTRATOR_MODEL = "nvidia/nemotron-3-super-120b-a12b"
CLASSIFIER_MODEL = "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B"
MICROLESSON_MODEL = "deepseek-ai/DeepSeek-V4-Pro"
