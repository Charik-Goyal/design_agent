from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json
from pathlib import Path
import os, re
from openai import OpenAI, OpenAIError
from textwrap import dedent
from dotenv import load_dotenv
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)
load_dotenv()
auth_key = os.getenv("OPENAI_API_KEY")
client = OpenAI()

# Standardized interview stages (in order)
STAGES = ["Understanding the Problem", "The Set Up", "High-Level Design", "Potential Deep Dives"]

STAGE_PROMPTS = {
    "Understanding the Problem": """
**Stage 1 – Understanding the Problem**
Goals
• List and clarify **functional requirements** ("what the system must do").
• List and clarify **non‑functional requirements** (latency, throughput, scale, SLA, consistency, availability, cost, security…).
• Surface ambiguities & assumptions; decide what is explicitly *out of scope*.
• Quantify key NFRs with ballpark numbers if possible (QPS, p99 latency, data size, traffic growth).

Interviewer checklist
1. Ask the candidate to restate the problem in their own words.
2. Elicit functional requirements with open questions ("What should users be able to do?"). Probe edge‑cases.
3. Switch to NFRs: latency, scale, consistency, availability, durability, cost.
4. Push for concrete numbers (or reasonable estimates) that drive design decisions.
5. Confirm scope & assumptions; summarise and get explicit agreement before moving on.
""",

    "The Set Up": """
**Stage 2 – The Set Up**
Goals
• Identify core **entities / data objects** and their high‑level attributes.
• Define the main **APIs / operations** needed to satisfy functional requirements.
• Mark system boundaries & external dependencies (auth, payments, 3rd‑party services).
• Optionally outline a rough step‑by‑step plan for tackling the design.

Interviewer checklist
1. Prompt for key nouns → entities. Capture concise definitions.
2. Prompt for key verbs → API endpoints or RPCs. Cover CRUD & special ops.
3. Ask which responsibilities are handled inside vs outside (e.g. authentication, email, push notifications).
4. Ensure every functional requirement from Stage 1 maps to at least one API.
5. Summarise entities & APIs; confirm completeness with the candidate before proceeding.
""",

    "High‑Level Design": """
**Stage 3 – High‑Level Design**
Goals
• Sketch the architecture: major components/services, data stores, caches, queues.
• Describe data‑flow for key operations end‑to‑end.
• Select technologies/types (SQL vs NoSQL, message broker, CDN, etc.) and justify briefly.
• Show how the design meets the stated functional & primary non‑functional requirements.
• Highlight major trade‑offs and alternatives.

Interviewer checklist
1. Ask candidate to enumerate components; probe each for responsibility.
2. Walk through a core user request – which component does what?
3. Check that the design provides stated latency/throughput/availability targets (point to cache, replicas, etc.).
4. Introduce missing standard pieces via questions (load‑balancer, cache, etc.).
5. Summarise the architecture; ensure all requirements are addressed before deep dives.
""",

    "Potential Deep Dives": """
**Stage 4 – Potential Deep Dives**
Goals
• Investigate 1–2 challenging areas in detail (scaling reads/writes, sharding, consistency model, fault‑tolerance, security, etc.).
• Discuss algorithms, data‑partitioning strategy, replication & failover, index design, caching strategy, quotas, back‑pressure, etc.
• Analyse failure modes, trade‑offs, and capacity limits.
• Demonstrate depth of understanding and practical decision‑making.

Interviewer checklist
1. Pick the most critical bottleneck or risk; ask the candidate to propose solutions.
2. Push on edge‑cases, race‑conditions, failure scenarios. Ask for mitigation.
3. Compare multiple approaches (e.g. consistent hashing vs range partitioning).
4. If time permits, tackle a second deep‑dive area (security, cost optimisation, migrations…).
5. Wrap up by summarising the improved design and remaining open questions.
""",
}

INTERVIEWER_BEHAVIOR_PROMPT = """
You are a **professional System‑Design Interviewer AI**.  You simulate a real FAANG/
tier‑1 interviewer in a mock interview.  You **always** run the conversation in
**four sequential stages** and **never skip ahead**:

1. **Understanding the Problem** – Clarify every functional & non‑functional
   requirement; push for concrete numbers; confirm in/out‑of‑scope.
2. **The Set Up** – Identify core entities and main APIs; define system boundaries;
   establish the shared vocabulary for the design.
3. **High‑Level Design** – Lay out the architecture: components, data‑flow,
   technology choices, trade‑offs, how the design satisfies the requirements.
4. **Potential Deep Dives** – Pick 1–2 challenging areas (scalability,
   consistency, fault‑tolerance, security, etc.) and explore them in depth,
   analysing algorithms, data‑partitioning, failure modes, trade‑offs.

**Behaviour rules**
• Plan silently first: recall the stage goals, think, then reply.
• Stay strictly on the **current stage**; gently refuse to answer out‑of‑stage
  questions ("Let's finish X before we tackle Y").
• Guide with **questions & hints**, not full answers.  Encourage the candidate
  to reason aloud; nudge if they are stuck.
• If the candidate omits a critical point, ask an open question to surface it.
• Before advancing a stage, **summarise** what has been achieved and explicitly
  confirm agreement with the candidate.
• If you want to proceed to the next stage, say "next stage" or "move on to stage". Specifically when you are done with the current stage and form now on you will be asking questions to the candidate from the next stage.
• Maintain a friendly, supportive tone.  Your goal is to help the candidate
  think deeply, demonstrate structured reasoning, and cover trade‑offs.
"""

# In-memory storage for session states keyed by user_id
sessions: dict = {}

class SessionState:
    """Tracks the interview state for a user, including current stage and problem-specific data."""
    def __init__(self, problem_name: str):
        self.problem_name = problem_name
        self.stage_index = 0  # Start at the first stage (index 0 in STAGES)
        self.history = []     # Conversation history: list of {"role": ..., "content": ...} messages
        self.allHistory = []
        self.problem_data = self._load_problem_data(problem_name)
    
    def clean_string(self, s: str) -> str:
        # 1) Dedent and trim
        text = dedent(s).strip()
        # 2) Collapse internal spaces/tabs (but keep newlines)
        #    Replace two or more spaces/tabs with one space
        text = re.sub(r"[ \t]{2,}", " ", text)
        # 3) Collapse multiple blank lines to a single newline
        text = re.sub(r"\n{2,}", "\n", text)
        return text

    def clean_whitespace(self, obj):
        if isinstance(obj, str):
            return self.clean_string(obj)
        elif isinstance(obj, list):
            return [self.clean_whitespace(item) for item in obj]
        elif isinstance(obj, dict):
            return {k: self.clean_whitespace(v) for k, v in obj.items()}
        else:
            return obj
    
    def _load_problem_data(self, problem_name: str) -> dict:
        """Load problem-specific template data from a JSON file."""
        # Try loading from current directory or a 'problems' subdirectory
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")
        path = os.path.join(TEMPLATES_DIR, f"{problem_name}.json")
        if not os.path.exists(path):
            raise FileNotFoundError(f"Template {problem_name} not found")
        json_data = json.load(open(path, "r"))
        return self.clean_whitespace(json_data)
    
    def current_stage_name(self) -> str:
        """Get the name of the current interview stage."""
        return STAGES[self.stage_index]
    
    def advance_stage(self):
        """Move to the next stage of the interview, if possible."""
        if self.stage_index < len(STAGES) - 1:
            self.stage_index += 1
        else:
            # If already at the last stage, we do nothing or raise (here we raise to indicate misuse)
            raise HTTPException(status_code=400, detail="Already at the final stage; cannot advance further.")
    
    def at_final_stage(self) -> bool:
        """Check if the session is at the last stage."""
        return self.stage_index >= len(STAGES) - 1

def assemble_messages(session: SessionState, user_message: str) -> list:
    """
    Build the message list for the OpenAI API given the session state and new user input.
    This includes the global prompt, stage prompt, problem-specific context, prior history, and the user message.
    """
    messages = []
    stage_name = session.current_stage_name()
    # 1. Global interviewer behavior system prompt
    messages.append({"role": "system", "content": INTERVIEWER_BEHAVIOR_PROMPT, "stage": stage_name})
    # 2. Stage-specific instructions as another system prompt
    if stage_name in STAGE_PROMPTS:
        messages.append({"role": "system", "content": f"**Stage: {stage_name}** – {STAGE_PROMPTS[stage_name]}", "stage": stage_name})
    else:
        messages.append({"role": "system", "content": f"Stage: {stage_name}", "stage": stage_name})
    # 3. Problem-specific content for the current stage (if any)
    messages.append({"role": "system", "content": f"**Example answer:** {session.problem_data[stage_name]} above answer contains more data then the user can handle, so you need to ask follow up questions to the candidate to understand the problem better.", "stage": stage_name})
    # 4. Add prior conversation history (all user and assistant messages so far)
    for msg in session.history:
        messages.append(session.clean_whitespace(msg))
    # 5. Finally, add the new user message
    messages.append({"role": "user", "content": session.clean_whitespace(user_message)})
    return messages

# Pydantic model for incoming user messages (candidate's input)
class UserInput(BaseModel):
    user_id: str
    message: str
    graph: Optional[dict] = None

class StartRequest(BaseModel):
    user_id: str
    problem_name: str

@app.post("/start")
async def start_interview(payload: StartRequest):
    """
    Initialize a new system design interview session for the given user and problem.
    Returns the initial prompt from the interviewer (assistant) and the starting stage.
    """
    # Reset or create a new session for this user
    user_id = payload.user_id
    problem_name = payload.problem_name
    sessions[user_id] = SessionState(problem_name)
    session = sessions[user_id]
    stage_name = session.current_stage_name()
    # If the problem JSON has an introductory description of the problem, include that in the first prompt
    intro_text = None
    for intro_key in ("Introduction", "Problem Statement", "Context"):
        if intro_key in session.problem_data:
            intro_section = session.problem_data[intro_key]
            # If stored as list of paragraphs, join them; otherwise take as string
            if isinstance(intro_section.get("content"), list):
                intro_text = " ".join(intro_section["content"])
            elif intro_section.get("content"):
                intro_text = str(intro_section["content"])
            # Use only the first matching intro section
            if intro_text:
                break
    # Construct the initial assistant message
    if intro_text:
        assistant_msg = (
            f"**Problem:** {intro_text}\n\n"
            f"Let's start with **Stage 1: {stage_name}**. "
            f"To begin, could you summarize your understanding of the problem and its requirements?"
        )
    else:
        assistant_msg = (
            f"Starting the system design interview for **{problem_name}**. "
            f"Let's begin with **Stage 1: {stage_name}**. "
            "First, could you describe your understanding of the problem requirements and scope?"
        )
    # Save the assistant's message to history and return it
    session.history = [{"role": "assistant", "content": assistant_msg}]
    return {"reply": assistant_msg, "nextStage": stage_name}

@app.post("/interact")
def interact(user_input: UserInput):
    """
    Process the candidate's message and generate the interviewer's response for the current stage.
    Advances to the next stage when appropriate.
    """
    user_id = user_input.user_id
    user_message = user_input.message
    graph_data = user_input.graph
    
    # Convert graph data to string and append to message
    if graph_data:
        graph_str = f"\n\nGraph Data:\n{json.dumps(graph_data, indent=2)}"
        user_message += graph_str
    
    # Ensure there's an active session
    if user_id not in sessions:
        raise HTTPException(status_code=400, detail="No active interview session for this user. Please start a session first.")
    session = sessions[user_id]
    # Assemble the prompt messages for the AI, and record the user's message in history
    messages = assemble_messages(session, user_message)
    session.history.append({"role": "user", "content": user_message})
    # Call OpenAI API (or an agent) to get the interviewer AI's response
    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.5,
            max_tokens=1500
        )
    except OpenAIError as err:
        print("OpenAI error:", err)
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(err)}")
    print("completion",completion)
    ai_reply = completion.choices[0].message.content.strip()
    # Save the assistant's response in the history
    session.history.append({"role": "assistant", "content": ai_reply})
    # Check if we should advance to the next stage based on the assistant's reply
    if not session.at_final_stage():
        # If the AI explicitly says to move on to next stage (or mentions the next stage), then advance
        if any(kw in ai_reply.lower() for kw in ("next stage", "move to stage", "move on to stage")):
            # 1) Build a transcript of the current-stage history
            print("before moving to next stage")
            transcript = "\n\n".join(
                f"{msg['role'].upper()}: {msg['content']}"
                for msg in session.history
            )
            print("transcript",transcript)
            # 2) Ask the model to summarize that transcript
            summary_messages = [
                {
                    "role": "system",
                    "content": (
                        "You are a helpful assistant that "
                        "summarizes the following conversation in a few sentences "
                        "so we can continue an interview from where we left off."
                    )
                },
                {"role": "user", "content": transcript}
            ]
            summary_resp = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=summary_messages,
                temperature=0.3,
                max_tokens=200
            )
            summary = summary_resp.choices[0].message.content.strip()
            print(summary)
            # 3) Advance the stage, archive the old history, and start with the summary
            session.advance_stage()
            session.allHistory.append(session.history)
            session.history = [
                {"role": "assistant", "content": f"**Summary so far:** {summary}"}
            ]
    print(session.current_stage_name())
    return {"reply": ai_reply, "nextStage": session.current_stage_name()}
