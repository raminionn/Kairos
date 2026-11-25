"""Optional adapter: any callable str -> str works as `llm`; this one wraps the Anthropic API.
Needs `pip install anthropic` and ANTHROPIC_API_KEY. (Not exercised in the offline test run.)"""
from __future__ import annotations


def anthropic_llm(model: str = "claude-sonnet-5-5", max_tokens: int = 1500):
    import anthropic

    client = anthropic.Anthropic()

    def call(prompt: str) -> str:
        msg = client.messages.create(model=model, max_tokens=max_tokens, messages=[{"role": "user", "content": prompt}])
        return "".join(b.text for b in msg.content if b.type == "text")

    return call
