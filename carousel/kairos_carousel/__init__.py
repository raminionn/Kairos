"""Deterministic carousel generator: text command -> copy -> HTML/CSS slides -> layout guard -> PDF."""
from .parse import parse_text, outline_from_command, command_prompt
from .pipeline import build_carousel, build_from_command, build_from_topic, build_from_brief, Report, Issue

__all__ = ["parse_text", "outline_from_command", "command_prompt", "build_carousel", "build_from_topic", "build_from_brief", "build_from_command", "Report", "Issue"]
