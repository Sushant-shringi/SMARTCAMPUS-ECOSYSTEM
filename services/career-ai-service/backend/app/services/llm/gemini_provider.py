"""
Google Gemini LLM Provider Implementation
Communicates with the Google Gemini API using the official google-genai SDK.
Key is loaded securely from backend environment (GEMINI_API_KEY).
"""
import os
from google import genai
from google.genai import types
from backend.app.config import settings
from backend.app.services.llm.base import LLMProvider

class GeminiProvider(LLMProvider):
    """
    LLMProvider implementation for Google Gemini API.
    """
    def __init__(self, api_key: str | None = None, model: str | None = None):
        self.api_key = api_key if api_key is not None else settings.GEMINI_API_KEY
        self.model = model or settings.GEMINI_MODEL

    @property
    def provider_name(self) -> str:
        return f"Google Gemini ({self.model})"

    def is_available(self) -> tuple[bool, str]:
        """
        Validates if GEMINI_API_KEY is configured in backend environment.
        """
        key = self.api_key or os.environ.get("GEMINI_API_KEY", "")
        if not key or not key.strip():
            return False, "Gemini API key is not configured. Add GEMINI_API_KEY to the backend environment."
        return True, f"Google Gemini is configured with model '{self.model}'."

    def generate(self, prompt: str, system_prompt: str = "") -> str:
        """
        Generates content using Google Gemini GenAI SDK.
        """
        key = self.api_key or os.environ.get("GEMINI_API_KEY", "")
        if not key or not key.strip():
            return "Gemini API key is not configured. Add GEMINI_API_KEY to the backend environment."

        try:
            client = genai.Client(api_key=key)
            
            config = types.GenerateContentConfig(
                temperature=0.2,
                system_instruction=system_prompt if system_prompt else None
            )

            models_to_try = [self.model]
            for fallback in ["gemini-2.5-flash", "gemini-3.1-flash-lite"]:
                if fallback not in models_to_try:
                    models_to_try.append(fallback)

            last_error = None
            for candidate_model in models_to_try:
                try:
                    response = client.models.generate_content(
                        model=candidate_model,
                        contents=prompt,
                        config=config
                    )
                    if response and response.text:
                        return response.text.strip()
                except Exception as ex:
                    err_str = str(ex)
                    last_error = ex
                    if "503" in err_str or "UNAVAILABLE" in err_str or "high demand" in err_str.lower():
                        continue
                    raise ex

            if last_error:
                raise last_error

            return "No text response received from Gemini API."

        except Exception as e:
            err_msg = str(e)
            # Sanitize error message to ensure no API key or sensitive traceback is exposed
            if "API_KEY_INVALID" in err_msg or "API key not valid" in err_msg:
                return "Error: The provided GEMINI_API_KEY is invalid. Please check your API key in the backend environment."
            elif "RESOURCE_EXHAUSTED" in err_msg or "quota" in err_msg.lower():
                return "Error: Gemini API quota exceeded. Please check your quota limits or try again later."
            elif "NOT_FOUND" in err_msg or "404" in err_msg:
                return f"Error: The configured Gemini model '{self.model}' was not found. Please verify GEMINI_MODEL in your environment."
            else:
                # Generic clean user-facing error message
                return f"Gemini API Error: {err_msg.splitlines()[0] if err_msg else 'An error occurred while generating response.'}"
