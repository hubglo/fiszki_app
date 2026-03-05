from flask import Flask, render_template, jsonify, request, redirect
import json
import os

app = Flask(__name__)
LEADERBOARD_FILE = 'rankings.json'

# Load flashcards from JSON file
def load_flashcards():
    with open('flashcards.json', 'r', encoding='utf-8') as f:
        return json.load(f)

# Load themes from JSON file
def load_themes():
    with open('themes.json', 'r', encoding='utf-8') as f:
        return json.load(f)


def load_leaderboard():
    if not os.path.exists(LEADERBOARD_FILE):
        return {}

    with open(LEADERBOARD_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_leaderboard(leaderboard):
    directory = os.path.dirname(LEADERBOARD_FILE)
    if directory:
        os.makedirs(directory, exist_ok=True)

    with open(LEADERBOARD_FILE, 'w', encoding='utf-8') as f:
        json.dump(leaderboard, f, ensure_ascii=False, indent=2)

@app.route('/')
def start_page():
    return render_template('start.html')

@app.route('/category/<main_category>')
def category_page(main_category):
    data = load_flashcards()
    category = next((c for c in data['categories'] if c['id'] == main_category), None)
    
    if not category:
        return redirect('/')
    
    if category.get('hasSubcategories'):
        return render_template('category.html', category=category)
    else:
        return render_template('mode.html', category_id=main_category, category_name=category['name'])

@app.route('/category/<main_category>/<sub_category>')
def subcategory_page(main_category, sub_category):
    data = load_flashcards()
    main = next((c for c in data['categories'] if c['id'] == main_category), None)
    
    if not main or not main.get('hasSubcategories'):
        return redirect('/')
    
    sub = next((s for s in main.get('subcategories', []) if s['id'] == sub_category), None)
    if not sub:
        return redirect(f'/category/{main_category}')
    
    return render_template('mode.html', category_id=sub_category, category_name=sub['name'], data_key=sub.get('dataKey', sub_category))

@app.route('/flashcards/<category>')
def flashcards(category):
    return render_template('flashcards.html', category=category)

@app.route('/quiz/<category>')
def quiz(category):
    return render_template('quiz.html', category=category)

@app.route('/quiz-multichoice/<category>')
def quiz_multichoice(category):
    return render_template('quiz-multichoice.html', category=category)

@app.route('/api/categories')
def get_categories():
    data = load_flashcards()
    if 'categories' in data:
        return jsonify(data['categories'])
    return jsonify([])

@app.route('/api/flashcards')
def get_flashcards_api():
    category = request.args.get('category', 'capitals')
    data = load_flashcards()
    if category in data:
        return jsonify(data[category])
    return jsonify([])

@app.route('/api/themes')
def get_themes():
    themes_data = load_themes()
    return jsonify(themes_data['themes'])


@app.route('/api/leaderboard/storage', methods=['GET'])
def get_leaderboard_storage_info():
    return jsonify({
        'leaderboardFile': LEADERBOARD_FILE,
        'note': 'Wyniki są zapisywane lokalnie w pliku rankings.json.'
    })


@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    category = request.args.get('category', '').strip().lower()
    mode = request.args.get('mode', '').strip().lower()
    key = f'{category}:{mode}'

    leaderboard = load_leaderboard()
    entries = leaderboard.get(key, [])
    return jsonify(entries)


@app.route('/api/leaderboard', methods=['POST'])
def add_leaderboard_entry():
    payload = request.get_json(silent=True) or {}

    nickname = str(payload.get('nickname', '')).strip()
    category = str(payload.get('category', '')).strip().lower()
    mode = str(payload.get('mode', '')).strip().lower()

    score = payload.get('score')
    total_questions = payload.get('totalQuestions')
    elapsed_seconds = payload.get('elapsedSeconds')

    if not nickname or len(nickname) > 30:
        return jsonify({'error': 'Nickname musi mieć od 1 do 30 znaków.'}), 400

    if not category or not mode:
        return jsonify({'error': 'Brak kategorii lub trybu quizu.'}), 400

    if not isinstance(score, int) or not isinstance(total_questions, int):
        return jsonify({'error': 'Wynik i liczba pytań muszą być liczbami całkowitymi.'}), 400

    if not isinstance(elapsed_seconds, (int, float)):
        return jsonify({'error': 'Czas musi być liczbą.'}), 400

    if score < 0 or total_questions <= 0 or score > total_questions:
        return jsonify({'error': 'Nieprawidłowy wynik quizu.'}), 400

    if elapsed_seconds < 0:
        return jsonify({'error': 'Nieprawidłowy czas quizu.'}), 400

    entry = {
        'nickname': nickname,
        'score': score,
        'totalQuestions': total_questions,
        'elapsedSeconds': round(float(elapsed_seconds), 1)
    }

    key = f'{category}:{mode}'
    leaderboard = load_leaderboard()
    entries = leaderboard.get(key, [])
    entries.append(entry)
    entries.sort(key=lambda item: (-item['score'], item['elapsedSeconds']))
    leaderboard[key] = entries[:20]
    save_leaderboard(leaderboard)

    return jsonify(leaderboard[key])

if __name__ == '__main__':
    app.run()
