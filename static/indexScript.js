// Elements
const dailyPromptEl = document.getElementById('dailyPrompt');
const motivationalQuoteEl = document.getElementById('motivationalQuote');

// Show loading placeholders first
dailyPromptEl.textContent = "Loading today's prompt...";
motivationalQuoteEl.textContent = "Loading motivational quote...";

// Fetch AI-generated prompt of the day
fetch('/daily-prompt')
    .then(res => res.json())
    .then(data => {
        dailyPromptEl.textContent = data.prompt || "No prompt available.";
    })
    .catch(() => {
        dailyPromptEl.textContent = "Unable to load prompt.";
    });

// Fetch motivational quote from local Flask endpoint
fetch('/quote')
    .then(res => res.json())
    .then(data => {
        motivationalQuoteEl.textContent = data.quote || "Stay positive today.";
    })
    .catch(() => {
        motivationalQuoteEl.textContent = "Keep going. You're doing great.";
    });
