from flask import Flask, render_template, jsonify, request, redirect
import json

app = Flask(__name__)

# Load flashcards from JSON file
def load_flashcards():
    with open('flashcards.json', 'r', encoding='utf-8') as f:
        return json.load(f)

# Load themes from JSON file
def load_themes():
    with open('themes.json', 'r', encoding='utf-8') as f:
        return json.load(f)

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

if __name__ == '__main__':
    app.run()
