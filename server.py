"""
AutoML

Launches the API server and allows access
using an Angular SPA.
"""

import ast
import os
import json
from shutil import copyfile

from flask import abort, Flask, jsonify, request, send_file, send_from_directory, url_for
from flask_cors import CORS
import pandas as pd

from ml import create_model, predict
from worker import CELERY, get_task_status, queue_training, revoke_task

PUBLISHED_MODELS = 'data/published-models.json'

APP = Flask(__name__, static_url_path='')
CORS(APP)

@APP.route('/')
def load_ui():
    """Loads `index.html` for the root path"""

    return send_from_directory('static', 'index.html')

@APP.route('/create/<uuid:userid>/<uuid:jobid>', methods=['POST'])
def create(userid, jobid):
    """Create a static copy of the selected model"""

    folder = 'data/' + userid.urn[9:] + '/' + jobid.urn[9:]

    label = open(folder + '/label.txt', 'r')
    label_column = label.read()
    label.close()

    create_model.create_model(
        request.form['key'],
        ast.literal_eval(request.form['parameters']),
        ast.literal_eval(request.form['features']),
        folder + '/train.csv',
        label_column,
        folder
    )

    if 'publishName' in request.form:
        model_path = folder + '/' + request.form['publishName']
        copyfile(folder + '/pipeline.joblib', model_path + '.joblib')
        copyfile(folder + '/pipeline.pmml', model_path + '.pmml')

        if os.path.exists(PUBLISHED_MODELS):
            with open(PUBLISHED_MODELS) as published_file:
                published = json.load(published_file)
        else:
            published = {}

        if request.form['publishName'] in published:
            abort(409)
            return

        published[request.form['publishName']] = {
            'features': request.form['features'],
            'path': model_path
        }

        with open(PUBLISHED_MODELS, 'w') as published_file:
            json.dump(published, published_file)

    return jsonify({'success': True})

@APP.route('/unpublish/<string:model>', methods=['DELETE'])
def unpublish_model(model):
    """Unpublish a published model"""

    if not os.path.exists(PUBLISHED_MODELS):
        abort(400)
        return

    with open(PUBLISHED_MODELS) as published_file:
        published = json.load(published_file)

    if model not in published:
        abort(400)
        return

    published.pop(model, None)

    with open(PUBLISHED_MODELS, 'w') as published_file:
        json.dump(published, published_file)

    return jsonify({'success': True})

@APP.route('/features/<string:model>', methods=['GET'])
def get_model_features(model):
    """Returns the features for a published model"""

    if not os.path.exists(PUBLISHED_MODELS):
        abort(400)
        return

    with open(PUBLISHED_MODELS) as published_file:
        published = json.load(published_file)

    if model not in published:
        abort(400)
        return

    return jsonify(published[model]['features'])

@APP.route('/test/<string:model>', methods=['POST'])
def test_published_model(model):
    """Tests the published model against the provided data"""

    if not os.path.exists(PUBLISHED_MODELS):
        abort(400)
        return

    with open(PUBLISHED_MODELS) as published_file:
        published = json.load(published_file)

    if model not in published:
        abort(400)
        return

    folder = published[model]['path'][:published[model]['path'].rfind('/')]
    label = open(folder + '/label.txt', 'r')
    label_column = label.read()
    label.close()

    reply = predict.predict(
        json.loads(request.data),
        published[model]['path']
    )

    reply['target'] = label_column

    return jsonify(reply)

@APP.route('/test/<uuid:userid>/<uuid:jobid>', methods=['POST'])
def test_model(userid, jobid):
    """Tests the selected model against the provided data"""

    folder = 'data/' + userid.urn[9:] + '/' + jobid.urn[9:]

    label = open(folder + '/label.txt', 'r')
    label_column = label.read()
    label.close()

    reply = predict.predict(
        json.loads(request.data),
        folder + '/pipeline'
    )

    reply['target'] = label_column

    return jsonify(reply)

@APP.route('/train/<uuid:userid>/<uuid:jobid>', methods=['POST'])
def find_best_model(userid, jobid):
    """Finds the best model for the selected parameters/data"""

    label = open('data/' + userid.urn[9:] + '/' + jobid.urn[9:] + '/label.txt', 'r')
    label_column = label.read()
    label.close()

    task = queue_training.s(
        userid.urn[9:], jobid.urn[9:], label_column, request.form.to_dict()
    ).apply_async()

    return jsonify({
        "id": task.id,
        "href": url_for('task_status', task_id=task.id)
    }), 202

@APP.route('/status/<task_id>')
def task_status(task_id):
    return jsonify(get_task_status(task_id))

@APP.route('/results/<uuid:userid>/<uuid:jobid>', methods=['GET'])
def get_results(userid, jobid):
    """Retrieve the training results"""

    folder = 'data/' + userid.urn[9:] + '/' + jobid.urn[9:]
    metadata = None

    if not os.path.exists(folder + '/report.csv'):
        abort(400)
        return

    try:
        results = json.loads(pd.read_csv(folder + '/report.csv').to_json(orient='records'))
    except:
        abort(400)

    if os.path.exists(folder + '/metadata.json'):
        with open(folder + '/metadata.json') as metafile:
            metadata = json.load(metafile)

    return jsonify({
        'results': results,
        'metadata': metadata
    })

@APP.route('/upload/<uuid:userid>/<uuid:jobid>', methods=['POST'])
def upload_files(userid, jobid):
    """Upload files to the server"""

    if 'train' not in request.files or 'test' not in request.files:
        return jsonify({'error': 'Missing files'})

    train = request.files['train']
    test = request.files['test']

    folder = 'data/' + userid.urn[9:] + '/' + jobid.urn[9:]

    if not os.path.exists(folder):
        os.makedirs(folder)

    if train and test:
        train.save(folder + '/train.csv')
        test.save(folder + '/test.csv')

        label = open(folder + '/label.txt', 'w')
        label.write(request.form['label_column'])
        label.close()

        return jsonify({'success': 'true'})

    return jsonify({'error': 'unknown'})

@APP.route('/clone/<uuid:userid>/<uuid:jobid>/<uuid:newjobid>', methods=['POST'])
def clone_job(userid, jobid, newjobid):
    """Copies the data source to a new job ID"""

    src_folder = 'data/' + userid.urn[9:] + '/' + jobid.urn[9:]
    dest_folder = 'data/' + userid.urn[9:] + '/' + newjobid.urn[9:]

    if not os.path.exists(src_folder) or\
        not os.path.exists(src_folder + '/train.csv') or\
        not os.path.exists(src_folder + '/test.csv') or\
        not os.path.exists(src_folder + '/label.txt'):
        abort(400)
        return

    if not os.path.exists(dest_folder):
        os.makedirs(dest_folder)

    copyfile(src_folder + '/train.csv', dest_folder + '/train.csv')
    copyfile(src_folder + '/test.csv', dest_folder + '/test.csv')
    copyfile(src_folder + '/label.txt', dest_folder + '/label.txt')

    return jsonify({'success': True})

@APP.route('/list-pending/<uuid:userid>', methods=['GET'])
def list_pending(userid):
    """Get all pending tasks for a given user ID"""

    active = []
    scheduled = []
    i = CELERY.control.inspect()
    scheduled_tasks = i.scheduled()
    scheduled_tasks = list(scheduled_tasks.values()) if scheduled_tasks else []
    for worker in scheduled_tasks:
        for task in worker:
            if str(userid) in task['request']['args']:
                try:
                    args = ast.literal_eval(task['request']['args'])
                except:
                    continue
                scheduled.append({
                    'id': task['request']['id'],
                    'eta': task['eta'],
                    'jobid': args[1],
                    'label': args[2],
                    'parameters': args[3],
                    'state': 'PENDING'
                })

    active_tasks = i.active()
    active_tasks = list(active_tasks.values()) if active_tasks else []
    reserved_tasks = i.reserved()
    reserved_tasks = list(reserved_tasks.values()) if reserved_tasks else []
    for worker in active_tasks + reserved_tasks:
        for task in worker:
            if '.queue_training' in task['type'] and str(userid) in task['args']:
                try:
                    args = ast.literal_eval(task['args'])
                except:
                    continue
                status = get_task_status(task['id'])
                status.update({
                    'id': task['id'],
                    'jobid': args[1],
                    'label': args[2],
                    'parameters': args[3],
                    'time': task['time_start']
                })
                active.append(status)
    return jsonify({
        'active': active,
        'scheduled': scheduled
    })

@APP.route('/cancel/<uuid:task_id>', methods=['DELETE'])
def cancel_task(task_id):
    """Cancels the provided task"""
    revoke_task(task_id)
    return jsonify({'success': True})

@APP.route('/list-jobs/<uuid:userid>', methods=['GET'])
def list_jobs(userid):
    """Get all the jobs for a given user ID"""

    folder = 'data/' + userid.urn[9:]

    if not os.path.exists(folder):
        abort(400)
        return

    jobs = []
    for job in os.listdir(folder):
        if not os.path.isdir(folder + '/' + job) or\
            not os.path.exists(folder + '/' + job + '/train.csv') or\
            not os.path.exists(folder + '/' + job + '/test.csv') or\
            not os.path.exists(folder + '/' + job + '/label.txt'):
            continue

        has_results = os.path.exists(folder + '/' + job + '/report.csv')
        label = open(folder + '/' + job + '/label.txt', 'r')
        label_column = label.read()
        label.close()

        if os.path.exists(folder + '/' + job + '/metadata.json'):
            with open(folder + '/' + job + '/metadata.json') as json_file:
                metadata = json.load(json_file)
        else:
            metadata = {}

        jobs.append({
            'id': job,
            'label': label_column,
            'results': has_results,
            'metadata': metadata
        })

    return jsonify(jobs)

@APP.route('/list-published/<uuid:userid>', methods=['GET'])
def list_published(userid):
    """Get all published models for a given user ID"""

    if not os.path.exists(PUBLISHED_MODELS):
        abort(400)
        return

    with open(PUBLISHED_MODELS) as published_file:
        published = json.load(published_file)

    user = userid.urn[9:]
    published = {k:ast.literal_eval(v['features']) for (k,v) in published.items() if user in v['path']}

    return jsonify(published)

@APP.route('/export/<uuid:userid>/<uuid:jobid>', methods=['GET'])
def export_results(userid, jobid):
    """Export the results CSV"""

    folder = 'data/' + userid.urn[9:] + '/' + jobid.urn[9:]

    if not os.path.exists(folder + '/report.csv'):
        abort(400)
        return

    return send_file(folder + '/report.csv', as_attachment=True)

@APP.route('/export-pmml/<uuid:userid>/<uuid:jobid>', methods=['GET'])
def export_pmml(userid, jobid):
    """Export the selected model's PMML"""

    folder = 'data/' + userid.urn[9:] + '/' + jobid.urn[9:]

    if not os.path.exists(folder + '/pipeline.pmml'):
        abort(400)
        return

    return send_file(folder + '/pipeline.pmml', as_attachment=True)

@APP.route('/export-pmml/<string:model>', methods=['GET'])
def export_published_pmml(model):
    """Export the published model's PMML"""

    if not os.path.exists(PUBLISHED_MODELS):
        abort(400)
        return

    with open(PUBLISHED_MODELS) as published_file:
        published = json.load(published_file)

    if model not in published:
        abort(400)
        return

    if not os.path.exists(published[model]['path'] + '.pmml'):
        abort(400)
        return

    return send_file(published[model]['path'] + '.pmml', as_attachment=True)

@APP.route('/export-model/<uuid:userid>/<uuid:jobid>', methods=['GET'])
def export_model(userid, jobid):
    """Export the selected model"""

    folder = 'data/' + userid.urn[9:] + '/' + jobid.urn[9:]

    if not os.path.exists(folder + '/pipeline.joblib'):
        abort(400)
        return

    return send_file(folder + '/pipeline.joblib', as_attachment=True)

@APP.route('/export-model/<string:model>', methods=['GET'])
def export_published_model(model):
    """Export the published model"""

    if not os.path.exists(PUBLISHED_MODELS):
        abort(400)
        return

    with open(PUBLISHED_MODELS) as published_file:
        published = json.load(published_file)

    if model not in published:
        abort(400)
        return

    if not os.path.exists(published[model]['path'] + '.joblib'):
        abort(400)
        return

    return send_file(published[model]['path'] + '.joblib', as_attachment=True)

@APP.errorhandler(404)
def page_not_found(e):
    """Redirect all invalid pages back to the root index"""

    return load_ui()

if __name__ == "__main__":
    APP.run()
