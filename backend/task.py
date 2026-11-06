from crewai import Task
from agents import doctor, verifier, nutritionist, exercise_specialist, qa_agent
from tools import search_tool, blood_test_tool,nutrition_tool, exercise_tool

## Creating a task to help solve user's query
help_patients = Task(
    description="Interpret the patient's health-related query based on their blood test report data below.\n\
Blood Test Report Data:\n{report}\n\n\
Query: {query}\n\n\
Identify any anomalies and respond with thoughtful, evidence-based medical insights based on these findings.",

    expected_output="""Your response should include:
- A brief summary of key findings from the blood report
- Interpretation of any unusual markers or results
- Personalized health suggestions or medical advice
- Recommended next steps or clinical follow-up""",

    agent=doctor,
    tools=[nutrition_tool, exercise_tool],
    input_variables=["query", "report"],
    async_execution=False,
)

## Creating a nutrition analysis task
nutrition_analysis = Task(
    description="Evaluate the patient's blood test report data below to determine dietary adjustments.\n\
Blood Test Report Data:\n{report}\n\n\
Focus on markers like glucose, lipids, vitamin levels, and iron to suggest nutrition strategies.\n\
Address any deficiencies or risks using evidence-based diet planning.",

    expected_output="""Include the following in the response:
- Nutritional deficiencies or imbalances detected
- Recommended foods or dietary changes to address those
- Suggested supplements if necessary
- Example meals or food groups""",

    agent=nutritionist,
    tools=[nutrition_tool],
    input_variables=["report"],
    async_execution=False,
)

## Creating an exercise planning task
exercise_planning = Task(
    description="Design an exercise routine tailored to the patient's health status as reflected in their blood report data below.\n\
Blood Test Report Data:\n{report}\n\n\
Consider cardiovascular health, metabolic markers, and overall fitness when creating the plan.",

    expected_output="""Your response should cover:
- Appropriate exercise types (e.g., cardio, strength, flexibility)
- Frequency and intensity recommendations
- Safety notes or health conditions to consider
- Progress tracking suggestions""",

    agent=exercise_specialist,
    tools=[exercise_tool],
    input_variables=["report"],
    async_execution=False,
)

## Creating a verification task
verification = Task(
    description="Verify whether the blood test report data below is a valid, authentic laboratory report.\n\
Blood Test Report Data:\n{report}\n\n\
Evaluate the test names, measured values, units, and reference ranges present in the text.",

    expected_output="""Provide:
- Validation status (Valid/Invalid)
- Key medical values and units extracted
- Completeness and clarity notes""",

    agent=verifier,
    tools=[],
    input_variables=["report"],
    async_execution=False
)

qa_task = Task(
    description="Answer the user's question about their blood test report.\n\
Report Text:\n{report_text}\n\n\
Conversation History:\n{conversation_history}\n\n\
User Question:\n{question}\n\n\
Rules:\n\
1. Answer using ONLY information explicitly present in the Report Text or Conversation History.\n\
2. Do NOT fabricate numbers, findings, or diagnoses not present in the report.\n\
3. If the question cannot be answered from the report, state clearly: 'The uploaded report does not contain this information.'",

    expected_output="A direct, accurate answer to the user's question based strictly on the provided report and history.",
    agent=qa_agent,
    input_variables=["report_text", "conversation_history", "question"],
    async_execution=False
)