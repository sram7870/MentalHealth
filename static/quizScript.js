document.addEventListener('DOMContentLoaded', () => {

  const quizzes = {
    phq9: [
      "Little interest or pleasure in doing things",
      "Feeling down, depressed, or hopeless",
      "Trouble falling or staying asleep, or sleeping too much",
      "Feeling tired or having little energy",
      "Poor appetite or overeating",
      "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
      "Trouble concentrating on things, such as reading the newspaper or watching television",
      "Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual",
      "Thoughts that you would be better off dead or of hurting yourself in some way"
    ],
    gad7: [
      "Feeling nervous, anxious, or on edge",
      "Not being able to stop or control worrying",
      "Worrying too much about different things",
      "Trouble relaxing",
      "Being so restless that it's hard to sit still",
      "Becoming easily annoyed or irritable",
      "Feeling afraid as if something awful might happen"
    ],
    ptsd: [
      "Repeated, disturbing memories, thoughts, or images of a stressful experience from the past",
      "Repeated, disturbing dreams of a stressful experience from the past",
      "Suddenly feeling or acting as if a stressful experience were happening again (as if you were reliving it)",
      "Feeling very upset when something reminds you of a stressful experience from the past",
      "Having strong physical reactions when something reminds you of a stressful experience from the past (heart pounding, trouble breathing, sweating)",
      "Avoiding thinking about or talking about a stressful experience from the past or avoiding having feelings related to it",
      "Avoiding activities, places, or people that remind you of a stressful experience from the past",
      "Trouble remembering important parts of a stressful experience from the past",
      "Feeling distant or cut off from other people",
      "Feeling emotionally numb or being unable to have loving feelings for those close to you",
      "Feeling irritable, angry, or having angry outbursts",
      "Taking too many risks or doing things that could cause you harm",
      "Having trouble concentrating",
      "Having trouble falling or staying asleep"
    ]
  };

  const severityColors = {
    none: '#A3BE8C',
    mild: '#EBCB8B',
    moderate: '#D08770',
    severe: '#BF616A',
    unknown: '#888'
  };

  let currentQuizType = null;
  let userAnswers = {};
  let summaries = {};

  function updateButtonStates() {
    const buttons = document.querySelectorAll('.quiz-btn');
    buttons.forEach(btn => {
      const quiz = btn.dataset.quiz;
      if (summaries[quiz]) {
        btn.disabled = true;
        btn.classList.remove('bg-blue-400', 'hover:bg-blue-500', 'bg-green-400', 'hover:bg-green-500', 'bg-red-400', 'hover:bg-red-500');
        btn.classList.add('bg-gray-400', 'cursor-not-allowed');
      } else {
        btn.disabled = false;
        btn.classList.remove('bg-gray-400', 'cursor-not-allowed');
        if (quiz === 'phq9') btn.classList.add('bg-blue-400', 'hover:bg-blue-500');
        else if (quiz === 'gad7') btn.classList.add('bg-green-400', 'hover:bg-green-500');
        else if (quiz === 'ptsd') btn.classList.add('bg-red-400', 'hover:bg-red-500');
      }
    });
  }

  document.querySelectorAll('.quiz-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentQuizType = btn.dataset.quiz;
      userAnswers = {};
      console.log(`[DEBUG] Quiz button clicked: ${currentQuizType}`);
      // REMOVE clearing summary-area to keep summaries visible
      // document.getElementById('summary-area').innerHTML = '';
      document.getElementById('overall-summary-area').classList.add('hidden');
      document.getElementById('overall-summary-area').innerHTML = '';
      loadQuiz(currentQuizType);
    });
  });

  document.getElementById('toggle-info').addEventListener('click', () => {
    document.getElementById('quiz-info').classList.toggle('open');
  });

  function loadQuiz(type) {
    const quizArea = document.getElementById('quiz-area');
    quizArea.innerHTML = '';
    const questions = quizzes[type];
    if (!questions) {
      console.warn(`[WARN] Quiz type '${type}' not found.`);
      return quizArea.innerHTML = '<p>Quiz not found.</p>';
    }

    const form = document.createElement('form');
    form.id = 'quiz-form';

    questions.forEach((q, i) => {
      const div = document.createElement('div');
      div.className = 'mb-4';

      const label = document.createElement('label');
      label.className = 'block mb-1 font-medium';
      label.textContent = `${i + 1}. ${q}`;
      div.appendChild(label);

      for (let val = 0; val <= 3; val++) {
        const radioId = `q${i}_val${val}`;
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = `q${i}`;
        input.value = val;
        input.id = radioId;
        input.required = true;
        input.className = 'auto-radio';

        const radioLabel = document.createElement('label');
        radioLabel.htmlFor = radioId;
        radioLabel.className = 'ml-2 mr-4 cursor-pointer select-none';
        radioLabel.textContent = val;

        div.appendChild(input);
        div.appendChild(radioLabel);
      }

      form.appendChild(div);
    });

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = (type === 'phq9') ? 'bg-blue-400 hover:bg-blue-500 text-white px-4 py-2 rounded' :
        (type === 'gad7') ? 'bg-green-400 hover:bg-green-500 text-white px-4 py-2 rounded' :
            (type === 'ptsd') ? 'bg-red-400 hover:bg-red-500 text-white px-4 py-2 rounded' :
                'bg-gray-400 text-white px-4 py-2 rounded';
    submitBtn.textContent = 'Submit Quiz';

    form.appendChild(submitBtn);
    quizArea.appendChild(form);

    form.addEventListener('submit', e => {
      e.preventDefault();
      handleQuizSubmit(type, form);
    });

    setupAutoFocus();
  }

  function setupAutoFocus() {
    const radios = document.querySelectorAll('.auto-radio');
    radios.forEach(input => {
      input.addEventListener('change', () => {
        const currentDiv = input.closest('div');
        const nextDiv = currentDiv.nextElementSibling;

        if (nextDiv) {
          const nextRadio = nextDiv.querySelector('input[type="radio"]');
          if (nextRadio) {
            nextRadio.scrollIntoView({ behavior: 'smooth', block: 'center' });
            nextRadio.focus({ preventScroll: true });
          }
        } else {
          // Scroll to submit button
          document.querySelector('#quiz-form button[type="submit"]').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });

    // Allow Enter/Arrow keys for navigation
    document.querySelectorAll('.auto-radio').forEach(radio => {
      radio.addEventListener('keydown', e => {
        const allRadios = Array.from(document.querySelectorAll('.auto-radio'));
        const idx = allRadios.indexOf(radio);
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          if (idx < allRadios.length - 1) allRadios[idx + 1].focus();
        }
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          if (idx > 0) allRadios[idx - 1].focus();
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          radio.click();
        }
      });
    });
  }

  function handleQuizSubmit(type, form) {
    const formData = new FormData(form);
    let score = 0;
    let qaPairs = [];

    for (let [key, value] of formData.entries()) {
      score += Number(value);
      const qIndex = parseInt(key.replace('q', ''), 10);
      const question = quizzes[type][qIndex];
      qaPairs.push(`Q: ${question}\nA: ${value}`);
    }

    userAnswers[type] = { score, qaPairs };

    fetch('/quiz/analyze-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizType: type, score, qaPairs: qaPairs.join('\n') })
    })
        .then(res => {
          return res.json();
        })
        .then(data => {
          summaries[type] = { summary: data.summary, severity: data.severity, score };
          displaySummary();
          updateButtonStates();
          // Keep the quiz area cleared after submit so user can see summary above
          document.getElementById('quiz-area').innerHTML = '';
        })
        .catch(err => {
          console.error('[ERROR] Error generating summary:', err);
          alert('Error generating summary. Please try again later.');
        });
  }

  function displaySummary() {
    const summaryArea = document.getElementById('summary-area');
    let html = '';
    for (const [quizType, data] of Object.entries(summaries)) {
      html += `
        <div class="mb-6 p-4 border rounded shadow bg-white">
          <h2 class="text-xl font-semibold mb-2">${quizType.toUpperCase()} Summary</h2>
          <p class="mb-2">${data.summary}</p>
          <p><strong>Severity:</strong> <span style="color: ${severityColors[data.severity] || severityColors.unknown}; text-transform: capitalize;">${data.severity}</span></p>
          <p><strong>Score:</strong> ${data.score}</p>
        </div>
      `;
    }
    summaryArea.innerHTML = html;

    const severities = Object.values(summaries).map(d => d.severity);
    const severityRank = { none: 0, mild: 1, moderate: 2, severe: 3, unknown: -1 };
    let maxSeverity = 'none';
    severities.forEach(s => {
      if (severityRank[s] > severityRank[maxSeverity]) maxSeverity = s;
    });
    document.getElementById('severity-bar').style.backgroundColor = severityColors[maxSeverity];
  }

  document.getElementById('overall-summary-btn').addEventListener('click', () => {
    const reflection = document.getElementById('user-reflection').value.trim();
    if (Object.keys(summaries).length === 0) {
      alert('Please complete at least one quiz first.');
      return;
    }

    const quizSummariesText = Object.entries(summaries)
        .map(([type, data]) => `${type.toUpperCase()} (Score: ${data.score}, Severity: ${data.severity})\nSummary: ${data.summary}`)
        .join('\n\n');

    fetch('/quiz/overall-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizSummaries: quizSummariesText, userReflection: reflection })
    })
        .then(res => {
          return res.json();
        })
        .then(data => {
          const overallArea = document.getElementById('overall-summary-area');
          overallArea.classList.remove('hidden');
          overallArea.innerHTML = `
          <h2 class="text-2xl font-bold mb-3">Overall Summary</h2>
          <p>${data.overallSummary}</p>
        `;
        })
        .catch(err => {
          console.error('[ERROR] Failed to generate overall summary:', err);
          alert('Failed to generate overall summary. Please try again later.');
        });
  });

  updateButtonStates();

});
