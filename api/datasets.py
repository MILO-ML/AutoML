"""
Handle dataset related requests
"""

import os
import time
import uuid
from shutil import rmtree

from flask import abort, g, jsonify, request

from ml.describe import describe as Describe
from common.storage import storage_factory

storage = storage_factory()
print(storage.get_container('data'))

def get():
    """Get all the datasets for a given user ID"""

    datasets = []
    folder = 'data/users/' + g.uid + '/datasets'

    if not os.path.exists(folder):
        abort(400)
        return

    for dataset in os.listdir(folder):
        if not os.path.isdir(folder + '/' + dataset) or\
            not os.path.exists(folder + '/' + dataset + '/train.csv') or\
            not os.path.exists(folder + '/' + dataset + '/test.csv') or\
            not os.path.exists(folder + '/' + dataset + '/label.txt'):
            continue

        with open(folder + '/' + dataset + '/label.txt') as label:
            label_column = label.read()

        datasets.append({
            'date': time.strftime(
                '%Y-%m-%dT%H:%M:%SZ',
                time.gmtime(max(
                    os.path.getmtime(root) for root, _, _ in os.walk(folder + '/' + dataset)
                ))
            ),
            'id': dataset,
            'label': label_column
        })

    return jsonify(datasets)

def add():
    """Upload files to the server"""

    if 'train' not in request.files or 'test' not in request.files:
        return abort(400)

    train = request.files['train']
    test = request.files['test']

    datasetid = uuid.uuid4().urn[9:]

    folder = 'data/users/' + g.uid + '/datasets/' + datasetid

    if not os.path.exists(folder):
        os.makedirs(folder)

    if not train or not test:
        abort(400)
        return

    train.save(folder + '/train.csv')
    test.save(folder + '/test.csv')

    with open(folder + '/label.txt', 'w') as label:
        label.write(request.form['label_column'])

    return jsonify({'id': datasetid})

def delete(datasetid):
    """Deletes a dataset"""

    folder = 'data/users/' + g.uid + '/datasets/' + datasetid.urn[9:]

    if not os.path.exists(folder):
        abort(400)
        return

    rmtree(folder)

    return jsonify({'success': True})

def describe(datasetid):
    """Generate descriptive statistics for training/testing datasets"""

    folder = 'data/users/' + g.uid + '/datasets/' + datasetid.urn[9:]

    if not os.path.exists(folder):
        abort(400)
        return

    with open(folder + '/label.txt') as label:
        label_column = label.read()

    return {
        'analysis': Describe(folder),
        'label': label_column
    }
