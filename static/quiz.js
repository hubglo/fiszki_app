document.addEventListener('DOMContentLoaded', () => {
    let flashcards = [];
    let currentCardIndex = 0;
    let score = 0;
    let questionTypes = []; // true = normal (country->capital), false = reverse (capital->country)

    const countryQuestionElement = document.getElementById('country-question');
    const capitalInputElement = document.getElementById('capital-input');
    const submitAnswerButton = document.getElementById('submit-answer');
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
            
            if (isNormalQuestion) {
                // Normal: obverse -> reverse
                countryQuestionElement.innerText = `Jaka jest odpowiedź dla: ${card.obverse}?`;
            } else {
                // Reverse: reverse -> obverse
                countryQuestionElement.innerText = `Jaka jest odpowiedź dla: ${card.reverse}?`;
            }
            
            resultMessageElement.innerText = '';
            capitalInputElement.value = '';
            capitalInputElement.placeholder = 'Wpisz odpowiedź...';
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
        
        setTimeout(() => {
            displayQuestion();
        }, 2000);
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

    submitAnswerButton.addEventListener('click', checkAnswer);
    capitalInputElement.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            checkAnswer();
        }
    });
});
