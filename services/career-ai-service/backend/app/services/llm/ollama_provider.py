"""
Ollama LLM Provider Implementation
Communicates with local Ollama daemon (default http://localhost:11434).
Requires zero cloud API keys or external dependencies.
"""
import httpx
from backend.app.config import settings
from backend.app.services.llm.base import LLMProvider

class OllamaProvider(LLMProvider):
    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL.rstrip('/')
        self.model = settings.OLLAMA_MODEL
        self.timeout = settings.LLM_TIMEOUT

    @property
    def provider_name(self) -> str:
        return f"Local Ollama ({self.model})"

    def is_available(self) -> tuple[bool, str]:
        """
        Pings Ollama server to check connectivity and model presence.
        """
        try:
            with httpx.Client(timeout=3.0) as client:
                res = client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models = [m.get("name", "").split(":")[0] for m in data.get("models", [])]
                    models_full = [m.get("name", "") for m in data.get("models", [])]
                    
                    if self.model in models or self.model in models_full:
                        return True, f"Ollama is running with model '{self.model}'."
                    elif len(models) > 0:
                        return True, f"Ollama is running (Installed models: {', '.join(models_full)}). Target model: '{self.model}'."
                    else:
                        return False, f"Ollama is running, but no models found. Run 'ollama pull {self.model}' in terminal."
                return False, f"Ollama responded with HTTP {res.status_code}"
        except httpx.ConnectError:
            return False, f"Cannot connect to Ollama at {self.base_url}. Please ensure Ollama is started ('ollama run {self.model}')."
        except Exception as e:
            return False, f"Ollama health check error: {str(e)}"

    def generate(self, prompt: str, system_prompt: str = "") -> str:
        """
        Sends generation request to Ollama /api/generate endpoint.
        """
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.2,
                "top_p": 0.9,
            }
        }
        if system_prompt:
            payload["system"] = system_prompt

        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(url, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    return data.get("response", "").strip()
                elif response.status_code == 404:
                    return f"Error: Model '{self.model}' not found in Ollama. Please run 'ollama pull {self.model}' in your terminal."
                else:
                    return f"Error from Ollama (HTTP {response.status_code}): {response.text}"
        except httpx.ConnectError:
            return (
                f"[Local Ollama Offline] Unable to reach Ollama at {self.base_url}. "
                f"Please start Ollama by running 'ollama run {self.model}' in your terminal."
            )
        except httpx.TimeoutException:
            return "[Ollama Timeout] The local model took too long to generate a response. Consider using a lighter model like 'llama3.2:1b' or 'phi3'."
        except Exception as e:
            return f"[LLM Error] {str(e)}"

# Global LLM instance
llm_provider = OllamaProvider()
