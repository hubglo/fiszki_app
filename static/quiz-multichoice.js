document.addEventListener('DOMContentLoaded', () => {
    let flashcards = [];
    let currentCardIndex = 0;
    let score = 0;
    let answered = false;
    let questionTypes = []; // true = normal (country->capital), false = reverse (capital->country)
    let quizStartTime = 0;

    const countryQuestionElement = document.getElementById('country-question');
    const answersContainerElement = document.getElementById('answers-container');
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

            resultMessageElement.innerText = '';
            answersContainerElement.innerHTML = '';
            answered = false;

            let correctAnswer;
            let questionText;
            let wrongAnswers;

            if (isNormalQuestion) {
                questionText = `Podaj odpowiedź dla: ${card.obverse}?`;
                correctAnswer = card.reverse;
                wrongAnswers = getWrongAnswers(correctAnswer, 3, true);
            } else {
                questionText = `Podaj odpowiedź dla: ${card.reverse}?`;
                correctAnswer = card.obverse;
                wrongAnswers = getWrongAnswers(correctAnswer, 3, false);
            }

            countryQuestionElement.innerText = questionText;
            const allAnswers = shuffleArray([correctAnswer, ...wrongAnswers]);

            allAnswers.forEach((answer, index) => {
                const button = document.createElement('button');
                button.className = 'answer-btn';
                button.innerText = answer;
                button.dataset.answer = answer;
                button.data_index = index;

                button.addEventListener('click', () => {
                    if (!answered) {
                        checkAnswer(answer, button, correctAnswer);
                    }
                });

                answersContainerElement.appendChild(button);
            });
        } else {
            finishQuiz();
        }
    }

    function finishQuiz() {
        const elapsedSeconds = (Date.now() - quizStartTime) / 1000;

        countryQuestionElement.innerText = "Quiz zakończony!";
        answersContainerElement.style.display = 'none';
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
                mode: 'multichoice',
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
        fetch(`/api/leaderboard?category=${category}&mode=multichoice`)
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

    function checkAnswer(selectedAnswer, clickedButton, correctAnswer) {
        answered = true;
        const allButtons = document.querySelectorAll('.answer-btn');

        allButtons.forEach(btn => btn.disabled = true);

        if (selectedAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim()) {
            score++;
            clickedButton.classList.add('correct');
            resultMessageElement.innerText = "Poprawna odpowiedź! ✓";
            resultMessageElement.className = 'correct';
        } else {
            clickedButton.classList.add('incorrect');
            resultMessageElement.innerText = `Błędna odpowiedź! Prawidłowa to: ${correctAnswer}`;
            resultMessageElement.className = 'incorrect';

            allButtons.forEach(btn => {
                if (btn.dataset.answer.toLowerCase().trim() === correctAnswer.toLowerCase().trim()) {
                    btn.classList.add('show-correct');
                }
            });
        }

        scoreElement.innerText = score;
        currentCardIndex++;

        setTimeout(() => {
            displayQuestion();
        }, 1500);
    }

    function getWrongAnswers(correctAnswer, count, useReverse) {
        const wrongAnswers = [];
        const field = useReverse ? 'reverse' : 'obverse';
        const availableAnswers = flashcards
            .map(card => card[field])
            .filter(answer => answer.toLowerCase().trim() !== correctAnswer.toLowerCase().trim());

        for (let i = 0; i < count && availableAnswers.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * availableAnswers.length);
            wrongAnswers.push(availableAnswers[randomIndex]);
            availableAnswers.splice(randomIndex, 1);
        }

        return wrongAnswers;
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
});
