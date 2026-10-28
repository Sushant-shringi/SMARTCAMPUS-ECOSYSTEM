"""
LLM Provider Abstraction
Abstract Base Class defining the interface for LLM completions.
Ensures zero tight coupling to any specific LLM provider.
"""
from abc import ABC, abstractmethod

class LLMProvider(ABC):
    """
    Abstract interface for LLM operations.
    """
    
    @abstractmethod
    def generate(self, prompt: str, system_prompt: str = "") -> str:
        """
        Generates text completion for a given prompt.
        """
        pass

    @abstractmethod
    def is_available(self) -> tuple[bool, str]:
        """
        Checks if the LLM backend is healthy and responding.
        Returns: (is_healthy, status_message)
        """
        pass

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Returns readable provider name e.g. 'Local Ollama (llama3.2)'"""
        pass
