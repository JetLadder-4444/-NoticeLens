from flask import Flask, render_template, request, jsonify
from analyzer import analyze_text

app = Flask(__name__)

@app.get('/')
def index():
    return render_template('index.html')

@app.post('/api/analyze')
def analyze():
    data = request.get_json(silent=True) or {}
    text = str(data.get('text', '')).strip()
    if not text:
        return jsonify({'error': 'Please paste some text first.'}), 400
    if len(text) > 30000:
        return jsonify({'error': 'Text is too long. Please keep it under 30,000 characters.'}), 400
    return jsonify(analyze_text(text))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
