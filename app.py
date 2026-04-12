from flask import Flask, render_template, jsonify, request, redirect
import json
import os
import random
import sqlite3
import time

app = Flask(__name__)
LEADERBOARD_FILE = 'rankings.json'
WORLD_SIZE = {'width': 2000, 'height': 1200}
WORLD_STATE_DB = 'world_state.db'
PLAYER_TTL_SECONDS = 120

# Load flashcards from JSON file
def load_flashcards():
    with open('flashcards.json', 'r', encoding='utf-8') as f:
        return json.load(f)

# Load themes from JSON file
def load_themes():
    with open('themes.json', 'r', encoding='utf-8') as f:
        return json.load(f)


def get_world_db_connection():
    connection = sqlite3.connect(WORLD_STATE_DB)
    connection.row_factory = sqlite3.Row
    return connection


def init_world_state_db():
    with get_world_db_connection() as connection:
        connection.execute(
            '''
            CREATE TABLE IF NOT EXISTS players (
                id TEXT PRIMARY KEY,
                nickname TEXT NOT NULL,
                x INTEGER NOT NULL,
                y INTEGER NOT NULL,
                updated_at REAL NOT NULL
            )
            '''
        )
        connection.commit()


def cleanup_stale_players(connection):
    expires_at = time.time() - PLAYER_TTL_SECONDS
    connection.execute('DELETE FROM players WHERE updated_at < ?', (expires_at,))
    connection.commit()


init_world_state_db()


def get_all_questions():
    data = load_flashcards()
    questions = []

    for category in data.get('categories', []):
        data_key = category.get('dataKey', category.get('id'))
        if data_key and data_key in data:
            for item in data[data_key]:
                obverse = item.get('obverse') or item.get('country')
                reverse = item.get('reverse') or item.get('capital')
                if obverse and reverse:
                    questions.append({
                        'question': f'{obverse}',
                        'answer': f'{reverse}',
                        'category': category.get('name', category.get('id', 'Nieznana'))
                    })

        for sub in category.get('subcategories', []):
            sub_key = sub.get('dataKey', sub.get('id'))
            if sub_key and sub_key in data:
                for item in data[sub_key]:
                    obverse = item.get('obverse') or item.get('country')
                    reverse = item.get('reverse') or item.get('capital')
                    if obverse and reverse:
                        questions.append({
                            'question': f'{obverse}',
                            'answer': f'{reverse}',
                            'category': sub.get('name', sub.get('id', 'Nieznana'))
                        })

    return questions


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


@app.route('/adventure')
def adventure():
    return render_template('adventure.html', world_size=WORLD_SIZE)

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


@app.route('/api/adventure/challenge', methods=['GET'])
def get_adventure_challenge():
    questions = get_all_questions()
    if not questions:
        return jsonify({'error': 'Brak pytań do wyzwań przygodowych.'}), 404

    challenge = random.choice(questions)
    return jsonify(challenge)


@app.route('/api/world/join', methods=['POST'])
def world_join():
    payload = request.get_json(silent=True) or {}
    player_id = str(payload.get('id', '')).strip() or str(random.randint(1000, 999999))
    nickname = str(payload.get('nickname', 'Gracz')).strip()[:20] or 'Gracz'
    x = int(payload.get('x', 100))
    y = int(payload.get('y', 100))
    x = max(0, min(WORLD_SIZE['width'], x))
    y = max(0, min(WORLD_SIZE['height'], y))

    with get_world_db_connection() as connection:
        cleanup_stale_players(connection)
        connection.execute(
            '''
            INSERT INTO players (id, nickname, x, y, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                nickname = excluded.nickname,
                x = excluded.x,
                y = excluded.y,
                updated_at = excluded.updated_at
            ''',
            (player_id, nickname, x, y, time.time())
        )
        connection.commit()

    return jsonify({'playerId': player_id, 'worldSize': WORLD_SIZE})


@app.route('/api/world/move', methods=['POST'])
def world_move():
    payload = request.get_json(silent=True) or {}
    player_id = str(payload.get('id', '')).strip()
    if not player_id:
        return jsonify({'error': 'Brak id gracza.'}), 400

    x = int(payload.get('x', 0))
    y = int(payload.get('y', 0))
    x = max(0, min(WORLD_SIZE['width'], x))
    y = max(0, min(WORLD_SIZE['height'], y))

    with get_world_db_connection() as connection:
        cleanup_stale_players(connection)
        current = connection.execute('SELECT id FROM players WHERE id = ?', (player_id,)).fetchone()
        if not current:
            return jsonify({'error': 'Gracz nie został znaleziony.'}), 404
        connection.execute(
            'UPDATE players SET x = ?, y = ?, updated_at = ? WHERE id = ?',
            (x, y, time.time(), player_id)
        )
        connection.commit()

    return jsonify({'ok': True})


@app.route('/api/world/state', methods=['GET'])
def world_state():
    with get_world_db_connection() as connection:
        cleanup_stale_players(connection)
        rows = connection.execute('SELECT id, nickname, x, y FROM players').fetchall()
        snapshot = [dict(row) for row in rows]
    return jsonify({'players': snapshot})


@app.route('/api/world/leave', methods=['POST'])
def world_leave():
    payload = request.get_json(silent=True) or {}
    player_id = str(payload.get('id', '')).strip()
    if not player_id:
        return jsonify({'ok': True})

    with get_world_db_connection() as connection:
        connection.execute('DELETE FROM players WHERE id = ?', (player_id,))
        connection.commit()
    return jsonify({'ok': True})


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
