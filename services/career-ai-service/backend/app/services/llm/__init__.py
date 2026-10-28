"""
LLM Services Module
Provides abstract LLM interface, provider factory, and concrete implementations
for Google Gemini API and Local Ollama.
"""
from backend.app.config import settings
from backend.app.services.llm.base import LLMProvider
from backend.app.services.llm.ollama_provider import OllamaProvider
from backend.app.services.llm.gemini_provider import GeminiProvider

def get_llm_provider(provider_type: str | None = None) -> LLMProvider:
    """
    Factory function returning the configured LLM provider instance.
    Supports 'gemini' and 'ollama'.
    """
    p_type = (provider_type or settings.LLM_PROVIDER).lower().strip()
    if p_type == "gemini":
        return GeminiProvider()
    elif p_type == "ollama":
        return OllamaProvider()
    else:
        # Default fallback to Gemini if configured or Ollama
        return GeminiProvider() if settings.GEMINI_API_KEY else OllamaProvider()

# Module-level default provider instance
llm_provider = get_llm_provider()

__all__ = [
    "LLMProvider",
    "GeminiProvider",
    "OllamaProvider",
    "get_llm_provider",
    "llm_provider",
]
