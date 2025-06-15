document.addEventListener('DOMContentLoaded', () => {
    const chatWindow = document.getElementById('chatWindow');
    const chatForm = document.getElementById('chatForm');
    const userInput = document.getElementById('userInput');

    // Function to append messages to chat window
    function appendMessage(sender, message) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('p-3', 'rounded-md', 'max-w-[80%]', 'break-words');

        if (sender === 'user') {
            messageDiv.classList.add('bg-red-400', 'text-white', 'self-end');
        } else {
            messageDiv.classList.add('bg-gray-200', 'text-gray-800', 'self-start');
        }
        messageDiv.textContent = message;
        chatWindow.appendChild(messageDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    // Handle form submit
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const message = userInput.value.trim();
        if (!message) return;

        appendMessage('user', message);
        userInput.value = '';
        userInput.disabled = true;

        try {
            const response = await fetch('/chatbot/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });

            const data = await response.json();
            if (response.ok) {
                appendMessage('bot', data.reply);
            } else {
                appendMessage('bot', 'Sorry, there was an error. Please try again.');
            }
        } catch (error) {
            appendMessage('bot', 'Network error. Please try again.');
        } finally {
            userInput.disabled = false;
            userInput.focus();
        }
    });
});
