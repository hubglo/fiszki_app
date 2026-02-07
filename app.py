from flask import Flask, render_template, jsonify
import json

app = Flask(__name__)

# Load flashcards from JSON file
def load_flashcards():
    with open('flashcards.json', 'r', encoding='utf-8') as f:
        return json.load(f)

@app.route('/')
def start_page():
    return render_template('start.html')

@app.route('/flashcards')
def flashcards():
    return render_template('flashcards.html')

@app.route('/quiz')
def quiz():
    return render_template('quiz.html')

@app.route('/quiz-multichoice')
def quiz_multichoice():
    return render_template('quiz-multichoice.html')

@app.route('/api/flashcards')
def get_flashcards():
    flashcards = load_flashcards()
    return jsonify(flashcards)

if __name__ == '__main__':
    app.run()
