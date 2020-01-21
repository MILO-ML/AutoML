"""
Search for the best model for a given dataset
"""

import ast
import os
import json
import time
import uuid
from shutil import copyfile, rmtree

from flask import abort, jsonify, request, send_file, url_for
import pandas as pd

from ml.create_model import create_model
from ml.list_pipelines import list_pipelines
from ml.predict import predict
from worker import queue_training

PUBLISHED_MODELS = 'data/published-models.json'

def get(userid):
    """Get all the jobs for a given user ID"""

    folder = 'data/users/' + userid + '/jobs'

    if not os.path.exists(folder):
        abort(400)
        return

    jobs = []
    for job in os.listdir(folder):
        if not os.path.isdir(folder + '/' + job) or\
            not os.path.exists(folder + '/' + job + '/metadata.json'):
            continue

        with open(folder + '/' + job + '/metadata.json') as metafile:
            metadata = json.load(metafile)

        jobs.append({
            'date': time.strftime(
                '%Y-%m-%dT%H:%M:%SZ',
                time.gmtime(max(
                    os.path.getmtime(root) for root, _, _ in os.walk(folder + '/' + job)
                ))
            ),
            'id': job,
            'hasResults': os.path.exists(folder + '/' + job + '/report.csv'),
            'metadata': metadata
        })

    return jsonify(jobs)

def create(userid):
    """Creates a new job"""

    try:
        datasetid = request.get_json()['datasetid']
    except KeyError:
        abort(400)
        return

    jobid = uuid.uuid4().urn[9:]

    folder = 'data/users/' + userid + '/jobs/' + jobid

    if not os.path.exists(folder):
        os.makedirs(folder)

    metadata = {}
    if os.path.exists(folder + '/metadata.json'):
        with open(folder + '/metadata.json') as metafile:
            metadata = json.load(metafile)

    metadata['datasetid'] = datasetid

    with open(folder + '/metadata.json', 'w') as metafile:
        json.dump(metadata, metafile)

    return jsonify({'id': jobid})

def delete(userid, jobid):
    """Deletes a previous job"""

    folder = 'data/users/' + userid + '/jobs/' + jobid.urn[9:]

    if not os.path.exists(folder):
        abort(400)
        return

    rmtree(folder)

    return jsonify({'success': True})

def train(userid, jobid):
    """Finds the best model for the selected parameters/data"""

    parameters = request.form.to_dict()
    pipelines = list_pipelines(parameters)

    job_folder = 'data/users/' + userid + '/jobs/' + jobid.urn[9:]

    with open(job_folder + '/metadata.json') as metafile:
        metadata = json.load(metafile)

    dataset_folder = 'data/users/' + userid + '/datasets/' + metadata['datasetid']

    with open(dataset_folder + '/label.txt') as label:
        label_column = label.read()

    task = queue_training.s(
        userid, jobid.urn[9:], label_column, parameters
    ).apply_async()

    return jsonify({
        "id": task.id,
        "href": url_for('status', task_id=task.id),
        "pipelines": pipelines
    }), 202

def result(userid, jobid):
    """Retrieve the training results"""

    folder = 'data/users/' + userid + '/jobs/' + jobid.urn[9:]
    metadata = None

    if not os.path.exists(folder + '/report.csv'):
        abort(400)
        return

    try:
        data = json.loads(pd.read_csv(folder + '/report.csv').to_json(orient='records'))
    except ValueError:
        abort(400)

    if os.path.exists(folder + '/metadata.json'):
        with open(folder + '/metadata.json') as metafile:
            metadata = json.load(metafile)

    return jsonify({
        'results': data,
        'metadata': metadata
    })

def get_pipelines(userid, jobid):
    """Returns the pipelines for a job"""

    folder = 'data/users/' + userid + '/jobs/' + jobid.urn[9:]

    if not os.path.exists(folder + '/' + '/metadata.json'):
        abort(400)
        return

    with open(folder + '/' + '/metadata.json') as json_file:
        metadata = json.load(json_file)

    return jsonify(list_pipelines(metadata['parameters']))

def refit(userid, jobid):
    """Create a static copy of the selected model"""

    job_folder = 'data/users/' + userid + '/jobs/' + jobid.urn[9:]

    with open(job_folder + '/metadata.json') as metafile:
        metadata = json.load(metafile)

    dataset_folder = 'data/users/' + userid + '/datasets/' + metadata['datasetid']

    with open(dataset_folder + '/label.txt') as label:
        label_column = label.read()

    create_model(
        request.form['key'],
        ast.literal_eval(request.form['parameters']),
        ast.literal_eval(request.form['features']),
        dataset_folder + '/train.csv',
        label_column,
        job_folder
    )

    if 'publishName' in request.form:
        model_path = job_folder + '/' + request.form['publishName']
        copyfile(job_folder + '/pipeline.joblib', model_path + '.joblib')
        copyfile(job_folder + '/pipeline.pmml', model_path + '.pmml')

        if os.path.exists(PUBLISHED_MODELS):
            with open(PUBLISHED_MODELS) as published_file:
                published = json.load(published_file)
        else:
            published = {}

        if request.form['publishName'] in published:
            abort(409)
            return

        published[request.form['publishName']] = {
            'date': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            'features': request.form['features'],
            'path': model_path
        }

        with open(PUBLISHED_MODELS, 'w') as published_file:
            json.dump(published, published_file)

    return jsonify({'success': True})

def test(userid, jobid):
    """Tests the selected model against the provided data"""

    folder = 'data/users/' + userid + '/jobs/' + jobid.urn[9:]

    with open(folder + '/metadata.json') as metafile:
        metadata = json.load(metafile)

    reply = predict(
        json.loads(request.data),
        folder + '/pipeline'
    )

    reply['target'] = metadata['label']

    return jsonify(reply)

def export(userid, jobid):
    """Export the results CSV"""

    folder = 'data/users/' + userid + '/jobs/' + jobid.urn[9:]

    if not os.path.exists(folder + '/report.csv'):
        abort(400)
        return

    return send_file(folder + '/report.csv', as_attachment=True)

def export_pmml(userid, jobid):
    """Export the selected model's PMML"""

    folder = 'data/users/' + userid + '/jobs/' + jobid.urn[9:]

    if not os.path.exists(folder + '/pipeline.pmml'):
        abort(400)
        return

    return send_file(folder + '/pipeline.pmml', as_attachment=True)

def export_model(userid, jobid):
    """Export the selected model"""

    folder = 'data/users/' + userid + '/jobs/' + jobid.urn[9:]

    if not os.path.exists(folder + '/pipeline.joblib'):
        abort(400)
        return

    return send_file(folder + '/pipeline.joblib', as_attachment=True)
