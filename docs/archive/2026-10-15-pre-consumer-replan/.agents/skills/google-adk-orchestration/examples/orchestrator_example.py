"""ADK-style Orchestrator Loop for EcoLoop."""
import os
import time
from typing import Dict, Any, List
from google import genai
from google.genai import types
from .allowlisted_tools import ALLOWLISTED_TOOLS, scale_meal_portions, check_cooking_cutoff, draft_mock_cart


class EcoLoopOrchestrator:
    def __init__(self, model_name: str = "gemini-2.5-flash"):
        self.model_name = model_name
        self.client = genai.Client()

    def run_plan_adjustment(
        self,
        user_message: str,
        current_inventory: List[Dict[str, Any]],
        current_recipe: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Orchestrate intent extraction, tool calling, and draft proposal creation."""
        start_time = time.time()
        tools_called = []

        system_instruction = (
            "You are the EcoLoop Resource Orchestrator. Your role is to help households "
            "and kitchens adapt when plans change, preventing food waste. "
            "You MUST call allowlisted tools to calculate portions, check cutoffs, or draft carts. "
            "NEVER calculate portions or currency math in text yourself."
        )

        # Declare available tool functions to Gemini
        tool_declarations = [
            scale_meal_portions,
            check_cooking_cutoff,
            draft_mock_cart,
        ]

        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            tools=tool_declarations,
            temperature=0.1,
        )

        prompt = (
            f"Context:\n"
            f"- Pantry Inventory: {current_inventory}\n"
            f"- Current Recipe: {current_recipe}\n\n"
            f"User Event/Message:\n\"{user_message}\"\n\n"
            f"Analyze the event and invoke the appropriate tool to adjust portions or check inventory."
        )

        # First turn: Gemini decides which tool to call
        response = self.client.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config=config,
        )

        tool_results = []
        if response.function_calls:
            for call in response.function_calls:
                func_name = call.name
                func_args = call.args
                tools_called.append(func_name)

                if func_name in ALLOWLISTED_TOOLS:
                    result = ALLOWLISTED_TOOLS[func_name](**func_args)
                    tool_results.append({
                        "tool": func_name,
                        "args": func_args,
                        "result": result,
                    })

        duration_ms = int((time.time() - start_time) * 1000)

        return {
            "orchestrator_summary": response.text if response.text else "Action proposal generated from tools.",
            "tools_invoked": tools_called,
            "tool_results": tool_results,
            "trace": {
                "model": self.model_name,
                "latency_ms": duration_ms,
                "tools_count": len(tools_called),
            },
        }
