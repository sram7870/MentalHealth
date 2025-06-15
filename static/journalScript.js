// Initialize Quill editor
const quill = new Quill('#editor', {
    theme: 'snow',
    placeholder: 'Write your journal entry here...',
});

// DOM elements
const currentDateInput = document.getElementById('currentDate');
const tagsInput = document.getElementById('tags');
const wordCountSpan = document.getElementById('wordCount');
const saveBtn = document.getElementById('saveBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const searchInput = document.getElementById('search');
const searchBtn = document.getElementById('searchBtn');
const showAllBtn = document.getElementById('showAllBtn');
const searchResults = document.getElementById('searchResults');
const analysisOutput = document.getElementById('analysisOutput');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

// Utility: Format Date to YYYY-MM-DD
function formatDate(date) {
    return date.toISOString().slice(0, 10);
}

// Set today's date as default and limit max selectable date
function setToday() {
    const todayStr = formatDate(new Date());
    currentDateInput.value = todayStr;
    currentDateInput.max = todayStr;
}
setToday();

// Check if a date is in the future
function isFutureDate(dateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(dateStr);
    return selected > today;
}

// Load entry for a given date and populate editor & tags
async function loadEntry(date) {
    if (!date || isFutureDate(date)) {
        alert("You cannot access journal entries for future dates.");
        return;
    }

    try {
        const res = await fetch(`/journal/entry/${date}`);
        if (!res.ok) throw new Error('Failed to fetch entry');

        const data = await res.json();
        const entry = data.entry || { content: '', tags: [] };

        let content = '';
        let tags = [];
        if (typeof entry === 'string') {
            content = entry;
        } else if (entry.content !== undefined) {
            content = entry.content;
            tags = entry.tags || [];
        }

        try {
            quill.setContents(JSON.parse(content));
        } catch {
            quill.root.innerHTML = content;
        }

        tagsInput.value = tags.join(', ');
        updateWordCount();
        analysisOutput.textContent = '';
    } catch (err) {
        quill.setText('');
        tagsInput.value = '';
        analysisOutput.textContent = '';
    }
}

// Save current entry for selected date
async function saveEntry() {
    const date = currentDateInput.value;
    if (!date || isFutureDate(date)) {
        alert('You cannot save entries for future dates.');
        return;
    }

    const contentDelta = quill.getContents();
    const contentJson = JSON.stringify(contentDelta);
    const tags = tagsInput.value
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

    const entry = { content: contentJson, tags };

    try {
        const res = await fetch('/journal/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, entry }),
        });

        const data = await res.json();
        if (data.status === 'success') {
            alert('Entry saved successfully!');
            loadAllEntries();
        } else {
            alert('Failed to save entry.');
        }
    } catch (err) {
        alert('Error saving entry.');
    }
}

// Update word count based on Quill plain text
function updateWordCount() {
    const text = quill.getText().trim();
    const words = text ? text.split(/\s+/).length : 0;
    wordCountSpan.textContent = `Words: ${words}`;
}

// Search entries by tag
async function searchByTag() {
    const tag = searchInput.value.trim().toLowerCase();
    if (!tag) {
        alert('Please enter a tag to search.');
        return;
    }

    try {
        const res = await fetch('/journal/entry_list');
        if (!res.ok) throw new Error('Failed to fetch entries list');

        const allEntries = await res.json();
        const results = [];

        for (const [date, entry] of Object.entries(allEntries)) {
            let tags = [];
            if (typeof entry === 'string') {
                tags = [];
            } else if (entry.tags !== undefined) {
                tags = entry.tags.map(t => t.toLowerCase());
            }
            if (tags.includes(tag)) {
                results.push({ date, entry });
            }
        }

        displayEntries(results);
    } catch (err) {
        alert('Error searching entries.');
    }
}

// Load and display all entries
async function loadAllEntries() {
    try {
        const res = await fetch('/journal/entry_list');
        if (!res.ok) throw new Error('Failed to fetch entries list');

        const allEntries = await res.json();
        const results = Object.entries(allEntries).map(([date, entry]) => ({
            date,
            entry,
        }));
        displayEntries(results);
    } catch (err) {
        alert('Error loading entries.');
    }
}

// Display entries in the searchResults list
function displayEntries(entries) {
    searchResults.innerHTML = '';
    if (entries.length === 0) {
        searchResults.innerHTML = '<li>No entries found.</li>';
        return;
    }

    entries.sort((a, b) => (a.date < b.date ? 1 : -1)); // newest first

    entries.forEach(({ date, entry }) => {
        const li = document.createElement('li');
        li.className =
            'p-3 border border-gray-200 rounded cursor-pointer hover:bg-gray-50';

        let preview = '';
        if (typeof entry === 'string') {
            preview = entry.slice(0, 120);
        } else if (entry.content) {
            try {
                const delta = JSON.parse(entry.content);
                preview = quill.getText(delta).slice(0, 120);
            } catch {
                preview = entry.content.slice(0, 120);
            }
        }

        li.innerHTML = `<strong>${date}</strong>: ${preview}${preview.length === 120 ? '...' : ''}`;
        li.addEventListener('click', () => {
            currentDateInput.value = date;
            loadEntry(date);
        });

        searchResults.appendChild(li);
    });
}

// Analyze past 5 days entries
async function analyzeMood() {
    analysisOutput.textContent = 'Analyzing... Please wait.';

    try {
        const res = await fetch('/journal/analyze', { method: 'POST' });
        if (!res.ok) throw new Error('Failed to analyze entries');

        const data = await res.json();
        analysisOutput.textContent = data.analysis || 'No analysis available.';
    } catch (err) {
        analysisOutput.textContent = 'Error analyzing entries.';
    }
}

// Adjust date by offset (in days)
function changeDate(offset) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let date = new Date(currentDateInput.value);
    date.setDate(date.getDate() + offset);

    if (date > today) {
        alert("You cannot access future dates.");
        return;
    }

    currentDateInput.value = formatDate(date);
    loadEntry(currentDateInput.value);
}

// Event Listeners
saveBtn.addEventListener('click', saveEntry);
analyzeBtn.addEventListener('click', analyzeMood);
searchBtn.addEventListener('click', searchByTag);
showAllBtn.addEventListener('click', loadAllEntries);
prevBtn.addEventListener('click', () => changeDate(-1));
nextBtn.addEventListener('click', () => changeDate(1));
quill.on('text-change', updateWordCount);
currentDateInput.addEventListener('change', () => loadEntry(currentDateInput.value));

// Initial load
loadEntry(currentDateInput.value);
loadAllEntries();
updateWordCount();
