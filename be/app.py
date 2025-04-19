from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI
from functools import lru_cache
import json, os

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

class InterviewRequest(BaseModel):
    msg: str
    graph: dict
    stage: str

class InterviewResponse(BaseModel):
    reply: str
    nextStage: str

@lru_cache()
def load_template(problem_name: str) -> dict:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")
    path = os.path.join(TEMPLATES_DIR, f"{problem_name}.json")
    if not os.path.exists(path):
        raise FileNotFoundError(f"Template {problem_name} not found")
    return json.load(open(path, "r"))

@app.post("/interview", response_model=InterviewResponse)
async def interview_endpoint(req: InterviewRequest):
    try:
        tmpl = load_template("bitly")
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))

    stages = tmpl.get("stages", [])
    if req.stage not in stages:
        raise HTTPException(400, "Invalid stage")

    stage_cfg = tmpl[req.stage]
    system_prompt   = stage_cfg["systemPrompt"]
    example_answer  = stage_cfg.get("exampleAnswer", "")
    user_content    = (
        f"User Message:\n{req.msg}\n\n"
        f"Diagram JSON:\n{json.dumps(req.graph, indent=2)}"
    )

    # Build the chat messages
    messages = [
        {"role": "system",    "content": system_prompt},
    ]
    if example_answer:
        messages.append({
            "role": "assistant",
            "content": f"### Example Answer\n{example_answer}"
        })
    messages.append({
        "role": "user",
        "content": user_content
    })

    # Call OpenAI
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages
    )
    reply = resp.choices[0].message.content.strip()
    print(reply)

    idx = stages.index(req.stage)
    next_stage = stages[idx+1] if idx+1 < len(stages) else req.stage

    return InterviewResponse(reply=reply, nextStage=next_stage)
