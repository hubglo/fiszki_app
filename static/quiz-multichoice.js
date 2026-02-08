document.addEventListener('DOMContentLoaded', () => {
    let flashcards = [];
    let currentCardIndex = 0;
    let score = 0;
    let answered = false;
    let questionTypes = []; // true = normal (country->capital), false = reverse (capital->country)

    const countryQuestionElement = document.getElementById('country-question');
    const answersContainerElement = document.getElementById('answers-container');
    const resultMessageElement = document.getElementById('result-message');
    const scoreElement = document.getElementById('score');
    const totalQuestionsElement = document.getElementById('total-questions');

    fetch(`/api/flashcards?category=${category}`)
        .then(response => response.json())
        .then(data => {
            flashcards = shuffleArray(data);
            questionTypes = flashcards.map(() => Math.random() > 0.5); // Randomly choose question type
            totalQuestionsElement.innerText = flashcards.length;
            if (flashcards.length > 0) {
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

            let correctAnswer, questionText, wrongAnswers;

            if (isNormalQuestion) {
                // Normal: obverse -> reverse
                questionText = `Podaj odpowiedź dla: ${card.obverse}?`;
                correctAnswer = card.reverse;
                wrongAnswers = getWrongAnswers(correctAnswer, 3, true);
            } else {
                // Reverse: reverse -> obverse
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
            countryQuestionElement.innerText = "Quiz zakończony!";
            answersContainerElement.style.display = 'none';
            resultMessageElement.innerText = `Twój końcowy wynik to: ${score} / ${flashcards.length}`;
            resultMessageElement.className = '';
        }
    }

    function checkAnswer(selectedAnswer, clickedButton, correctAnswer) {
        answered = true;
        const allButtons = document.querySelectorAll('.answer-btn');

        // Disable all buttons
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
            
            // Show the correct answer
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
        }, 2500);
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

    // Shuffle array function to randomize questions
    function shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }
});
