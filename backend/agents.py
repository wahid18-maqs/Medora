import os
from dotenv import load_dotenv
load_dotenv()

try:
    import crewai.llms.cache
    crewai.llms.cache.mark_cache_breakpoint = lambda m: m
except Exception:
    pass

from crewai import Agent, LLM
from tools import blood_test_tool, nutrition_tool, exercise_tool, search_tool, image_extraction_tool

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

gemini_llm = LLM(
    model="gemini/gemini-2.5-flash",
    api_key=GOOGLE_API_KEY,
    temperature=0.4
) if GOOGLE_API_KEY else None

# Fallback Groq LLM
groq_fallback_llm = LLM(
    model="groq/openai/gpt-oss-120b",
    api_key=GROQ_API_KEY,
    temperature=0.3
) if GROQ_API_KEY else None

llm = gemini_llm if gemini_llm else groq_fallback_llm

summary_llm = LLM(
    model="gemini/gemini-2.5-flash",
    api_key=GOOGLE_API_KEY,
    temperature=0.15
) if GOOGLE_API_KEY else None

summary_fallback_llm = LLM(
    model="groq/openai/gpt-oss-120b",
    api_key=GROQ_API_KEY,
    temperature=0.15
) if GROQ_API_KEY else None

def set_agents_llm(target_llm):
    """Switch LLM across all active agents dynamically."""
    if not target_llm:
        return
    for agent in [doctor, verifier, nutritionist, exercise_specialist, image_extractor, qa_agent]:
        agent.llm = target_llm
    if target_llm is gemini_llm:
        summary_agent.llm = summary_llm or target_llm
    elif target_llm is groq_fallback_llm:
        summary_agent.llm = summary_fallback_llm or target_llm
    else:
        summary_agent.llm = target_llm


# Creating an Experienced Doctor agent
doctor = Agent(
    role="Senior Experienced Doctor",
    goal="Analyze blood test reports and provide accurate medical insights for: {query}",
    verbose=False,
    memory=False,
    backstory=(
        "You are an experienced medical professional with expertise in interpreting blood test results. "
        "You provide evidence-based medical insights and recommendations based on laboratory findings. "
        "You always consider the full clinical picture and recommend appropriate follow-up care when needed. "
        "You emphasize the importance of consulting healthcare providers for proper medical advice."
    ),
    tools=[blood_test_tool, search_tool],
    llm=llm,
    max_iter=1,
    max_rpm=50,
    allow_delegation=False
)

# Creating a verifier agent
verifier = Agent(
    role="Blood Report Verifier",
    goal="Verify the authenticity and completeness of blood test reports",
    verbose=False,
    memory=False,
    backstory=(
        "You are a medical records specialist with expertise in validating blood test reports. "
        "You ensure that uploaded documents contain proper medical data, correct formatting, "
        "and all necessary information for accurate analysis. "
        "You flag any inconsistencies or missing data that might affect the interpretation."
    ),
    tools=[blood_test_tool, search_tool],
    llm=llm,
    max_iter=1,
    max_rpm=50,
    allow_delegation=False
)

nutritionist = Agent(
    role="Clinical Nutritionist",
    goal="Provide evidence-based nutritional recommendations based on blood test results",
    verbose=False,
    backstory=(
        "You are a certified clinical nutritionist with expertise in interpreting blood markers "
        "as they relate to nutritional status. You provide scientifically-backed dietary recommendations "
        "to address deficiencies, optimize health markers, and support overall wellness. "
        "You consider individual needs and medical conditions when making recommendations."
    ),
    tools=[blood_test_tool, nutrition_tool],
    llm=llm,
    max_iter=1,
    max_rpm=50,
    allow_delegation=False
)

exercise_specialist = Agent(
    role="Exercise Physiologist",
    goal="Create safe and effective exercise recommendations based on health markers",
    verbose=False,
    backstory=(
        "You are a certified exercise physiologist with expertise in designing exercise programs "
        "based on individual health profiles and blood test results. You consider cardiovascular health, "
        "metabolic markers, and any contraindications when creating personalized fitness recommendations. "
        "You prioritize safety and gradual progression in all exercise prescriptions."
    ),
    tools=[blood_test_tool, exercise_tool],
    llm=llm,
    max_iter=1,
    max_rpm=50,
    allow_delegation=False
)

summary_agent = Agent(
    role="Medical Report Summarizer",
    goal="Create a safe, plain-language summary from the already-completed agent findings and extracted markers",
    verbose=False,
    memory=False,
    backstory=(
        "You synthesize existing medical report analysis into a clear patient-facing summary. "
        "You never add new marker names, values, units, reference ranges, diagnoses, medications, "
        "or causes. You use only the verified marker list and the other agents' completed findings."
    ),
    llm=summary_llm or summary_fallback_llm or llm,
    max_iter=1,
    max_rpm=50,
    allow_delegation=False
)

image_extractor = Agent(
    role="Blood Report Image Extractor",
    goal="Transcribe laboratory values from report photos accurately and without inventing data",
    verbose=False,
    memory=False,
    backstory=(
        "You are a medical document transcription specialist. You read blood test report photos, "
        "use the image extraction tool, and return only structured JSON. You never guess values, "
        "and you preserve units and reference ranges exactly as printed."
    ),
    tools=[image_extraction_tool],
    llm=llm,
    max_iter=2,
    max_rpm=50,
    allow_delegation=False
)

qa_agent = Agent(
    role="Report Q&A Assistant",
    goal="Answer user questions strictly based on the provided blood test report text and conversation history",
    verbose=False,
    backstory=(
        "You are a helpful and precise medical report assistant. "
        "Your task is to answer questions using ONLY the provided blood test report text and prior conversation history. "
        "You must NOT invent values, diagnoses, or reference ranges that are not present in the report. "
        "If a question cannot be answered from the report alone or is a general medical question unrelated to this specific report, "
        "state plainly that the report does not contain that information."
    ),
    llm=llm,
    max_iter=1,
    max_rpm=50,
    allow_delegation=False
)