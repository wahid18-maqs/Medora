from crewai import Task
from agents import doctor, verifier, nutritionist, exercise_specialist, image_extractor, qa_agent
from tools import search_tool, blood_test_tool,nutrition_tool, exercise_tool, image_extraction_tool

## Creating a task to help solve user's query
help_patients = Task(
    description="Interpret the patient's health-related query using ONLY the extracted marker list and report text below.\n\
Extracted marker list (authoritative JSON):\n{markers_json}\n\n\
Blood Test Report Data:\n{report}\n\n\
Query: {query}\n\n\
Rules:\n\
1. Only mention tests that appear in the extracted marker list above. Never mention a test that is absent from that list.\n\
2. Use the exact status values from the JSON (Low, Normal, High). Do not contradict them.\n\
3. If the list contains only a few markers, say clearly that the analysis is limited to those markers.\n\
4. If the list is empty, state that no markers could be extracted and do not invent findings.\n\
5. Do not write a letter, salutation, or sign-off. Return concise markdown with a '## Key findings' section first.",

    expected_output="""Markdown only, with:
## Key findings
- A short bullet list of the extracted markers and their exact statuses
## Medical interpretation
- Evidence-based interpretation limited to those markers
## Next steps
- Clinical follow-up suggestions based only on the extracted markers""",

    agent=doctor,
    tools=[nutrition_tool, exercise_tool],
    input_variables=["query", "report", "markers_json"],
    async_execution=False,
)

## Creating a nutrition analysis task
nutrition_analysis = Task(
    description="Evaluate the patient's extracted blood markers below to determine dietary adjustments.\n\
Extracted marker list (authoritative JSON):\n{markers_json}\n\n\
Blood Test Report Data:\n{report}\n\n\
Rules:\n\
1. Only discuss nutrients and tests present in the extracted marker list above.\n\
2. Match the exact status values in the JSON and do not claim a normal marker is abnormal or vice versa.\n\
3. If only a few markers were extracted, state that the nutrition guidance is limited to those markers.\n\
4. If the list is empty, say that no marker-specific nutrition guidance can be provided.\n\
5. Do not write a letter, salutation, or sign-off. Return concise markdown with a '## Key findings' section first.",

    expected_output="""Markdown only, with:
## Key findings
- Extracted markers relevant to nutrition and their exact statuses
## Nutrition guidance
- Foods, dietary changes, or supplements tied only to those markers
## Practical next steps
- Brief, evidence-based actions""",

    agent=nutritionist,
    tools=[nutrition_tool],
    input_variables=["report", "markers_json"],
    async_execution=False,
)

## Creating an exercise planning task
exercise_planning = Task(
    description="Design an exercise routine based ONLY on the extracted markers and report text below.\n\
Extracted marker list (authoritative JSON):\n{markers_json}\n\n\
Blood Test Report Data:\n{report}\n\n\
Rules:\n\
1. Only mention markers present in the extracted marker list above.\n\
2. Use the exact status values from the JSON and do not contradict them.\n\
3. If only a few markers were extracted, state that the exercise guidance is limited to those markers.\n\
4. If the list is empty, say that no marker-specific exercise guidance can be provided.\n\
5. Do not write a letter, salutation, or sign-off. Return concise markdown with a '## Key findings' section first.",

    expected_output="""Markdown only, with:
## Key findings
- Extracted markers relevant to exercise and their exact statuses
## Exercise plan
- Appropriate exercise types, frequency, and intensity
## Safety notes
- Precautions tied only to the extracted markers""",

    agent=exercise_specialist,
    tools=[exercise_tool],
    input_variables=["report", "markers_json"],
    async_execution=False,
)

## Creating a verification task
verification = Task(
    description="Prepare questions the patient should ask their doctor, using ONLY the extracted markers and report text below.\n\
Extracted marker list (authoritative JSON):\n{markers_json}\n\n\
Blood Test Report Data:\n{report}\n\n\
Rules:\n\
1. Only mention tests that appear in the extracted marker list above.\n\
2. Use the exact status values from the JSON (Low, Normal, High).\n\
3. If only one marker was extracted, explicitly note that the review is limited to that marker.\n\
4. If the list is empty, state that no marker-specific questions can be generated.\n\
5. Do not write a letter, salutation, or sign-off. Return concise markdown.",

    expected_output="""Markdown only, with:
## Questions for your doctor
- 3 to 5 concise, clinically relevant questions based strictly on the extracted markers
## Report completeness
- Brief note on whether the extracted marker list appears limited or complete""",

    agent=verifier,
    tools=[],
    input_variables=["report", "markers_json"],
    async_execution=False
)

image_extraction_task = Task(
    description="Extract structured laboratory values from the uploaded blood test report images.\n\
Image paths (one per line):\n{image_paths}\n\n\
Use the extract_blood_report_image tool exactly once with those paths.\n\
Return ONLY the JSON object produced by the tool. Do not add commentary, markdown fences, or extra text.\n\
If the tool returns an error JSON object, return that error JSON unchanged.",
    expected_output=(
        'A single JSON object: {"status":"success","lab_name":string|null,'
        '"report_date":string|null,"markers":[{"marker":string,"value":string,'
        '"unit":string,"reference_range":string,"confidence":number}],'
        '"marker_warning":string|null,"file_names":[string]}'
    ),
    agent=image_extractor,
    tools=[image_extraction_tool],
    input_variables=["image_paths"],
    async_execution=False,
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