document.addEventListener('DOMContentLoaded', () => {
    let flashcards = [];
    let currentCardIndex = 0;
    let score = 0;
    let questionTypes = []; // true = normal (country->capital), false = reverse (capital->country)
    let quizStartTime = 0;

    const countryQuestionElement = document.getElementById('country-question');
    const capitalInputElement = document.getElementById('capital-input');
    const submitAnswerButton = document.getElementById('submit-answer');
    const resultMessageElement = document.getElementById('result-message');
    const scoreElement = document.getElementById('score');
    const totalQuestionsElement = document.getElementById('total-questions');
    const leaderboardSectionElement = document.getElementById('leaderboard-section');
    const nicknameInputElement = document.getElementById('nickname-input');
    const saveScoreButtonElement = document.getElementById('save-score-btn');
    const saveStatusElement = document.getElementById('save-status');
    const leaderboardListElement = document.getElementById('leaderboard-list');

    fetch(`/api/flashcards?category=${category}`)
        .then(response => response.json())
        .then(data => {
            flashcards = shuffleArray(data);
            questionTypes = flashcards.map(() => Math.random() > 0.5); // Randomly choose question type
            totalQuestionsElement.innerText = flashcards.length;
            if (flashcards.length > 0) {
                quizStartTime = Date.now();
                displayQuestion();
                setTimeout(() => capitalInputElement.focus(), 100);
            } else {
                countryQuestionElement.innerText = "Brak pytań w quizie.";
            }
        })
        .catch(error => {
            console.error('Error fetching flashcards:', error);
            countryQuestionElement.innerText = "Błąd ładowania quizu.";
        });

    function displayQuestion() {
        if (currentCardIndex < flashcards.length) {
            const isNormalQuestion = questionTypes[currentCardIndex];
            const card = flashcards[currentCardIndex];

            if (isNormalQuestion) {
                countryQuestionElement.innerText = `Jaka jest odpowiedź dla: ${card.obverse}?`;
            } else {
                countryQuestionElement.innerText = `Jaka jest odpowiedź dla: ${card.reverse}?`;
            }

            resultMessageElement.innerText = '';
            capitalInputElement.value = '';
            capitalInputElement.placeholder = 'Wpisz odpowiedź...';
            capitalInputElement.focus();

            setTimeout(() => {
                capitalInputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 200);
        } else {
            finishQuiz();
        }
    }

    function finishQuiz() {
        const elapsedSeconds = (Date.now() - quizStartTime) / 1000;

        countryQuestionElement.innerText = "Quiz zakończony!";
        document.getElementById('answer-container').style.display = 'none';
        resultMessageElement.innerText = `Twój końcowy wynik to: ${score} / ${flashcards.length} | Czas: ${formatTime(elapsedSeconds)}`;
        resultMessageElement.className = '';

        leaderboardSectionElement.style.display = 'block';
        saveScoreButtonElement.disabled = false;
        saveStatusElement.innerText = '';

        saveScoreButtonElement.onclick = () => saveScore(elapsedSeconds);
        loadLeaderboard();
    }

    function saveScore(elapsedSeconds) {
        const nickname = nicknameInputElement.value.trim();

        if (!nickname) {
            saveStatusElement.innerText = 'Wpisz imię lub pseudonim.';
            saveStatusElement.className = 'incorrect';
            return;
        }

        saveScoreButtonElement.disabled = true;
        saveStatusElement.innerText = 'Zapisywanie...';
        saveStatusElement.className = '';

        fetch('/api/leaderboard', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nickname,
                category,
                mode: 'text',
                score,
                totalQuestions: flashcards.length,
                elapsedSeconds
            })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Nie udało się zapisać wyniku.');
                }
                return response.json();
            })
            .then(entries => {
                saveStatusElement.innerText = 'Wynik zapisany!';
                saveStatusElement.className = 'correct';
                renderLeaderboard(entries);
            })
            .catch(error => {
                console.error(error);
                saveStatusElement.innerText = 'Błąd zapisu wyniku.';
                saveStatusElement.className = 'incorrect';
                saveScoreButtonElement.disabled = false;
            });
    }

    function loadLeaderboard() {
        fetch(`/api/leaderboard?category=${category}&mode=text`)
            .then(response => response.json())
            .then(entries => renderLeaderboard(entries))
            .catch(error => {
                console.error('Error fetching leaderboard:', error);
                leaderboardListElement.innerHTML = '<li>Nie udało się załadować rankingu.</li>';
            });
    }

    function renderLeaderboard(entries) {
        if (!entries.length) {
            leaderboardListElement.innerHTML = '<li>Brak wyników w rankingu.</li>';
            return;
        }

        leaderboardListElement.innerHTML = entries
            .map((entry, index) => `<li><strong>${index + 1}. ${escapeHtml(entry.nickname)}</strong> — ${entry.score}/${entry.totalQuestions}, ${formatTime(entry.elapsedSeconds)}</li>`)
            .join('');
    }

    function checkAnswer() {
        if (currentCardIndex >= flashcards.length) return;

        const userAnswer = capitalInputElement.value.trim().toLowerCase();
        const isNormalQuestion = questionTypes[currentCardIndex];
        const card = flashcards[currentCardIndex];

        const correctAnswer = isNormalQuestion ?
            card.reverse.trim().toLowerCase() :
            card.obverse.trim().toLowerCase();

        if (userAnswer === correctAnswer) {
            score++;
            resultMessageElement.innerText = "Poprawna odpowiedź!";
            resultMessageElement.className = 'correct';
        } else {
            const correctAnswerDisplay = isNormalQuestion ? card.reverse : card.obverse;
            resultMessageElement.innerText = `Błędna odpowiedź. Prawidłowa to: ${correctAnswerDisplay}`;
            resultMessageElement.className = 'incorrect';
        }

        scoreElement.innerText = score;
        currentCardIndex++;

        capitalInputElement.disabled = true;
        submitAnswerButton.disabled = true;

        setTimeout(() => {
            capitalInputElement.disabled = false;
            submitAnswerButton.disabled = false;
            displayQuestion();
        }, 2000);
    }

    function formatTime(secondsValue) {
        const totalSeconds = Math.max(0, Math.round(secondsValue));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${String(seconds).padStart(2, '0')}`;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.innerText = text;
        return div.innerHTML;
    }

    function shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    submitAnswerButton.addEventListener('click', checkAnswer);

    capitalInputElement.addEventListener('keyup', (event) => {
        if (event.key === 'Enter' && !submitAnswerButton.disabled) {
            checkAnswer();
        }
    });

    capitalInputElement.addEventListener('focus', (event) => {
        event.target.style.boxShadow = '0 0 0 3px rgba(0, 123, 255, 0.1)';
    });

    capitalInputElement.addEventListener('blur', (event) => {
        event.target.style.boxShadow = '';
    });
});
