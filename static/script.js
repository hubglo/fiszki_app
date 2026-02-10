let flashcards = [];
let currentCardIndex = 0;
let isFlipped = false;

// Swipe detection variables
let touchStartX = 0;
let touchEndX = 0;
let touchStartY = 0;
let touchEndY = 0;
const SWIPE_THRESHOLD = 50; // minimum distance for a swipe
const VERTICAL_THRESHOLD = 30; // max vertical movement allowed

document.addEventListener('DOMContentLoaded', () => {
    fetch(`/api/flashcards?category=${category}`)
        .then(response => response.json())
        .then(data => {
            flashcards = data;
            if (flashcards.length > 0) {
                displayCard();
                setupSwipeListeners();
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

    const card = flashcards[currentCardIndex];
    
    // Handle universal obverse/reverse format
    if (card.obverse !== undefined) {
        countryElement.innerText = card.obverse;
        capitalElement.innerText = card.reverse;
    } else if (card.country !== undefined) {
        // Fallback for old format
        countryElement.innerText = card.country;
        capitalElement.innerText = card.capital;
    }

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

// Swipe gesture support for touch devices
function setupSwipeListeners() {
    const flashcardContainer = document.getElementById('flashcard-container');
    if (!flashcardContainer) return;

    // Touch start - record initial position
    flashcardContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, false);

    // Touch end - detect swipe direction and magnitude
    flashcardContainer.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe();
    }, false);
}

function handleSwipe() {
    const horizontalDistance = touchEndX - touchStartX;
    const verticalDistance = Math.abs(touchEndY - touchStartY);

    // Only process if it's a horizontal swipe (not diagonal)
    if (Math.abs(horizontalDistance) > SWIPE_THRESHOLD && verticalDistance < VERTICAL_THRESHOLD) {
        // Swipe right = previous card
        if (horizontalDistance > 0) {
            prevCard();
        }
        // Swipe left = next card
        else {
            nextCard();
        }
    }
}
