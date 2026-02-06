let flashcards = [];
let currentCardIndex = 0;
let isFlipped = false;

document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/flashcards')
        .then(response => response.json())
        .then(data => {
            flashcards = data;
            if (flashcards.length > 0) {
                displayCard();
            } else {
                document.getElementById('country').innerText = "Brak fiszek.";
                document.getElementById('capital').innerText = "Brak fiszek.";
            }
        })
        .catch(error => {
            console.error('Error fetching flashcards:', error);
            document.getElementById('country').innerText = "Błąd ładowania fiszek.";
            document.getElementById('capital').innerText = "Błąd ładowania fiszek.";
        });
});

function displayCard() {
    const flashcardElement = document.getElementById('flashcard');
    const countryElement = document.getElementById('country');
    const capitalElement = document.getElementById('capital');

    countryElement.innerText = flashcards[currentCardIndex].country;
    capitalElement.innerText = flashcards[currentCardIndex].capital;

    // Reset flip state for new card
    if (isFlipped) {
        flashcardElement.classList.remove('flipped');
        isFlipped = false;
    }
}

function flipCard() {
    const flashcardElement = document.getElementById('flashcard');
    flashcardElement.classList.toggle('flipped');
    isFlipped = !isFlipped;
}

function nextCard() {
    currentCardIndex = (currentCardIndex + 1) % flashcards.length;
    displayCard();
}

function prevCard() {
    currentCardIndex = (currentCardIndex - 1 + flashcards.length) % flashcards.length;
    displayCard();
}
