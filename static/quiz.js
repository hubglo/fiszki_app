document.addEventListener('DOMContentLoaded', () => {
    let flashcards = [];
    let currentCardIndex = 0;
    let score = 0;

    const countryQuestionElement = document.getElementById('country-question');
    const capitalInputElement = document.getElementById('capital-input');
    const submitAnswerButton = document.getElementById('submit-answer');
    const resultMessageElement = document.getElementById('result-message');
    const scoreElement = document.getElementById('score');
    const totalQuestionsElement = document.getElementById('total-questions');

    fetch('/api/flashcards')
        .then(response => response.json())
        .then(data => {
            flashcards = shuffleArray(data);
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
            countryQuestionElement.innerText = flashcards[currentCardIndex].country;
            resultMessageElement.innerText = '';
            capitalInputElement.value = '';
            capitalInputElement.focus();
        } else {
            countryQuestionElement.innerText = "Quiz zakończony!";
            document.getElementById('answer-container').style.display = 'none';
            resultMessageElement.innerText = `Twój końcowy wynik to: ${score} / ${flashcards.length}`;
            resultMessageElement.className = '';
        }
    }

    function checkAnswer() {
        if (currentCardIndex >= flashcards.length) return;

        const userAnswer = capitalInputElement.value.trim().toLowerCase();
        const correctAnswer = flashcards[currentCardIndex].capital.trim().toLowerCase();

        if (userAnswer === correctAnswer) {
            score++;
            resultMessageElement.innerText = "Poprawna odpowiedź!";
            resultMessageElement.className = 'correct';
        } else {
            resultMessageElement.innerText = `Błędna odpowiedź. Prawidłowa to: ${flashcards[currentCardIndex].capital}`;
            resultMessageElement.className = 'incorrect';
        }

        scoreElement.innerText = score;
        currentCardIndex++;
        
        setTimeout(() => {
            displayQuestion();
        }, 2000); // Wait 2 seconds before showing the next question
    }

    // Shuffle array function to randomize questions
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    submitAnswerButton.addEventListener('click', checkAnswer);
    capitalInputElement.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            checkAnswer();
        }
    });
});
