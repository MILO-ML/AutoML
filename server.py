"""
AutoML

Launches the API server and allows access
using an Angular SPA.
"""

import ast
import os

import pandas as pd
from flask import abort, Flask, jsonify, request, send_file, send_from_directory
from flask_cors import CORS

from api import api
from api import create_model
from api import predict

APP = Flask(__name__, static_url_path='')
CORS(APP)

@APP.route('/')
def load_ui():
    """Loads `index.html` for the root path"""

    return send_from_directory('static', 'index.html')

@APP.route('/create', methods=['POST'])
def create():
    """Create a static copy of the selected model"""

    label = open('data/label.txt', 'r')
    label_column = label.read()
    label.close()

    create_model.create_model(
        request.form['key'],
        ast.literal_eval(request.form['parameters']),
        ast.literal_eval(request.form['features']),
        'data/train.csv',
        label_column
    )

    return jsonify({'success': True})

@APP.route('/test', methods=['POST'])
def test_model():
    """Tests the selected model against the provided data"""

    label = open('data/label.txt', 'r')
    label_column = label.read()
    label.close()

    return jsonify(predict.predict(
        [float(x) for x in request.form['data'].split(',')],
        'data/train.csv',
        label_column
    ))

@APP.route('/train', methods=['POST'])
def find_best_model():
    """Finds the best model for the selected parameters/data"""

    label = open('data/label.txt', 'r')
    label_column = label.read()
    label.close()

    labels = ['No ' + label_column, label_column]

    os.environ['IGNORE_ESTIMATOR'] = request.form['ignore_estimator']
    os.environ['IGNORE_FEATURE_SELECTOR'] = request.form['ignore_feature_selector']
    os.environ['IGNORE_SCALER'] = request.form['ignore_scaler']
    os.environ['IGNORE_SEARCHER'] = request.form['ignore_searcher']
    os.environ['IGNORE_SCORER'] = request.form['ignore_scorer']
    if request.form.get('ignore_shuffle'):
        os.environ['IGNORE_SHUFFLE'] = request.form.get('ignore_shuffle')

    api.find_best_model('data/train.csv', 'data/test.csv', labels, label_column)
    return jsonify({'success': True})

@APP.route('/results', methods=['GET'])
def get_results():
    """Retrieve the training results"""

    if not os.path.exists('report.csv'):
        abort(404)
        return

    return pd.read_csv('report.csv').to_json(orient='records')

@APP.route('/export', methods=['GET'])
def export_results():
    """Export the results CSV"""

    if not os.path.exists('report.csv'):
        abort(404)
        return

    return send_file('report.csv', as_attachment=True)

@APP.route('/export-pmml', methods=['GET'])
def export_pmml():
    """Export the selected model's PMML"""

    if not os.path.exists('pipeline.pmml'):
        abort(404)
        return

    return send_file('pipeline.pmml', as_attachment=True)

@APP.route('/export-model', methods=['GET'])
def export_model():
    """Export the selected model"""

    if not os.path.exists('pipeline.joblib'):
        abort(404)
        return

    return send_file('pipeline.joblib', as_attachment=True)

@APP.route('/upload', methods=['POST'])
def upload_files():
    """Upload files to the server"""

    if 'train' not in request.files or 'test' not in request.files:
        return jsonify({'error': 'Missing files'})

    train = request.files['train']
    test = request.files['test']

    if train and test:
        train.save('data/train.csv')
        test.save('data/test.csv')

        label = open('data/label.txt', 'w')
        label.write(request.form['label_column'])
        label.close()

        return jsonify({'success': 'true'})

    return jsonify({'error': 'unknown'})

@APP.route('/<path:path>')
def get_static_file(path):
    """Retrieve static files from the UI path"""

    if not os.path.isfile(os.path.join('static', path)):
        path = os.path.join(path, 'index.html')

    return send_from_directory('static', path)

if __name__ == "__main__":
    APP.run()
