from flask import Flask, request, jsonify, render_template
import requests
import json
import os
from datetime import datetime, timedelta

app = Flask(__name__, static_folder='static')

# OpenRouter API Key
OPENROUTER_API_KEY = "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"

# Journal data file
JOURNAL_FILE = "journal_entries.json"
if not os.path.exists(JOURNAL_FILE):
    with open(JOURNAL_FILE, 'w') as f:
        json.dump({}, f)

def load_entries():
    with open(JOURNAL_FILE, 'r') as f:
        return json.load(f)

def save_entries(entries):
    with open(JOURNAL_FILE, 'w') as f:
        json.dump(entries, f, indent=2)

def get_severity(quiz_type, score):
    if quiz_type == 'phq9':
        return 'none' if score < 5 else 'mild' if score < 10 else 'moderate' if score < 15 else 'severe'
    if quiz_type == 'gad7':
        return 'none' if score < 5 else 'mild' if score < 10 else 'moderate' if score < 15 else 'severe'
    if quiz_type == 'ptsd':
        return 'none' if score < 8 else 'mild' if score < 14 else 'moderate' if score < 21 else 'severe'
    return 'unknown'

def call_openrouter_gpt(prompt, max_tokens=300):
    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "openai/gpt-4o",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": max_tokens,
                "temperature": 0.7,
            }
        )
        response.raise_for_status()
        result = response.json()
        return result["choices"][0]["message"]["content"].strip()
    except:
        return "Sorry, something went wrong while trying to respond. Please try again in a moment."

def generate_quiz_summary(quiz_type, score, qa_pairs):
    prompt = f"""
You are a compassionate mental health assistant.

A user has completed the {quiz_type.upper()} quiz with a total score of {score}.

Here are the user's question-answer pairs:
{qa_pairs}

Please provide a clear, empathetic summary explaining what this score and answers might indicate about their mental health. Keep it supportive and informative but do not provide any diagnosis. Suggest some general next steps or resources they might consider.

IF THE SEVERITY IS MILD, and only then, make sure that you point out that what was shown could be due to a variety of factors and while it is important to be conscious of things bothering people, no one needs to be scared.

Respond in 3-5 sentences.
"""
    return call_openrouter_gpt(prompt, max_tokens=250)

# In-memory cache for daily prompt and quote
cached_prompt = {"text": None, "timestamp": None}
cached_quote = {"text": None, "timestamp": None}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/quiz')
def quiz():
    return render_template('quiz.html')

@app.route('/quiz/analyze-quiz', methods=['POST'])
def analyze_quiz():
    data = request.json
    quiz_type = data.get("quizType", "Unknown Quiz")
    score = data.get("score", 0)
    qa_pairs = data.get("qaPairs", "")

    severity = get_severity(quiz_type, score)
    summary = generate_quiz_summary(quiz_type, score, qa_pairs)

    return jsonify({"summary": summary, "severity": severity})

@app.route('/quiz/overall-summary', methods=['POST'])
def overall_summary():
    data = request.json
    quiz_summaries = data.get('quizSummaries', '')
    user_reflection = data.get('userReflection', '')

    prompt = f"""
You are a compassionate mental health assistant.

Here are the summaries of quizzes completed by the user:
{quiz_summaries}

The user also shared this reflection:
{user_reflection}

Please provide a thoughtful and empathetic overall summary that combines these insights. Keep it supportive and encourage next steps, but do not diagnose. 
Also, make sure that this is lengthy and detailed (this was indeed a quiz), providing links and websites that others can use for support as well. 
"""
    summary = call_openrouter_gpt(prompt, max_tokens=300)
    return jsonify({"overallSummary": summary})

@app.route('/chatbot')
def chatbot():
    return render_template('chatbot.html')

@app.route('/chatbot/message', methods=['POST'])
def chatbot_message():
    data = request.json
    user_message = data.get("message", "").strip()

    if not user_message:
        return jsonify({"reply": "Please enter a message so I can respond."})

    prompt = f"""
You are a compassionate and empathetic mental health chatbot designed to offer emotional support and active listening. A user has written the following message:

"{user_message}"

Please respond gently, supportively, and constructively. Avoid giving any medical diagnoses. If appropriate, invite the user to share more and in a 1/5 chance, remind them that seeking help from a professional is a strong and valid option.
"""
    bot_reply = call_openrouter_gpt(prompt, max_tokens=250)
    return jsonify({"reply": bot_reply})

# ----------------------------
# Journal Routes
# ----------------------------

@app.route('/journal')
def journal_page():
    return render_template('journal.html')

@app.route('/journal/entry/<date>')
def get_entry(date):
    entries = load_entries()
    return jsonify({"entry": entries.get(date, "")})

@app.route('/journal/save', methods=['POST'])
def save_entry():
    data = request.json
    date = data["date"]
    entry = data["entry"]
    entries = load_entries()
    entries[date] = entry
    save_entries(entries)
    return jsonify({"status": "success"})

@app.route('/journal/analyze', methods=['POST'])
def analyze_journal():
    entries = load_entries()
    today = datetime.today()
    recent_days = [(today - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(5)]
    recent_entries = [f"{date}: {entries.get(date, '')}" for date in recent_days if entries.get(date)]

    if not recent_entries:
        return jsonify({"analysis": "No entries from the past 5 days to analyze."})

    prompt = f"""
You are a compassionate mental health assistant.

Here are the journal entries from the past 5 days:
{recent_entries}

Please provide a supportive, non-judgmental mental health summary of how the user has been feeling based on these entries. Suggest gentle next steps if necessary, but avoid clinical diagnosis.
"""
    analysis = call_openrouter_gpt(prompt)
    return jsonify({"analysis": analysis})

# New route to get all journal entries for search & display
@app.route('/journal/entry_list')
def entry_list():
    entries = load_entries()
    return jsonify(entries)

@app.route('/daily-prompt')
def daily_prompt():
    now = datetime.now()
    if cached_prompt["text"] and cached_prompt["timestamp"] and now - cached_prompt["timestamp"] < timedelta(days=1):
        return jsonify({"prompt": cached_prompt["text"]})

    prompt = """
You are an AI assistant for a mental health platform. Generate a short reflective or expressive writing prompt to help the user explore their emotions, thoughts, or well-being. Make it concise (1-2 sentences), supportive, and suitable for journaling or introspection.
"""
    try:
        result = call_openrouter_gpt(prompt, max_tokens=60)
        cached_prompt["text"] = result
        cached_prompt["timestamp"] = now
        return jsonify({"prompt": result})
    except Exception as e:
        fallback = "Write about something that’s been on your mind recently."
        return jsonify({"prompt": fallback})

@app.route('/quote')
def motivational_quote():
    now = datetime.now()
    if cached_quote["text"] and cached_quote["timestamp"] and now - cached_quote["timestamp"] < timedelta(days=1):
        return jsonify({"quote": cached_quote["text"]})

    prompt = "Give me a short motivational quote related to mental health, resilience, or personal growth. Keep it under 30 words."
    try:
        result = call_openrouter_gpt(prompt, max_tokens=60)
        cached_quote["text"] = result
        cached_quote["timestamp"] = now
        return jsonify({"quote": result})
    except Exception:
        fallback = "You are stronger than you think. Keep going."
        return jsonify({"quote": fallback})

if __name__ == "__main__":
    app.run(debug=True)
