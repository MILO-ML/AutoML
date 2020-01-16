"""
Celery worker for machine learning jobs
"""

import os
import json

from celery import Celery
from celery.signals import worker_process_init
from celery.task.control import revoke

from ml import api

CELERY = Celery(__name__, backend='rpc://', broker='pyamqp://guest@localhost//')
CELERY.conf.update(task_track_started=True)

def fix_celery_solo(userid, jobid):
    """
    Celery retries tasks due to ACK issues when running in solo mode,
    We can manually check if the task has already completed and quickly finish the re-queue.
    """

    folder = 'data/' + userid + '/' + jobid
    if os.path.exists(folder + '/metadata.json'):
        with open(folder + '/metadata.json') as metafile:
            try:
                metadata = json.load(metafile)
            except ValueError:
                return False

        if 'date' in metadata:
            return True

    return False

@CELERY.task(bind=True)
def queue_training(self, userid, jobid, label_column, parameters):
    if fix_celery_solo(userid, jobid):
        return 0

    folder = 'data/' + userid + '/' + jobid
    labels = ['No ' + label_column, label_column]

    metadata = {}
    if os.path.exists(folder + '/metadata.json'):
        with open(folder + '/metadata.json') as metafile:
            metadata = json.load(metafile)

    metadata['parameters'] = parameters

    with open(folder + '/metadata.json', 'w') as metafile:
        json.dump(metadata, metafile)

    api.find_best_model(
        folder + '/train.csv',
        folder + '/test.csv',
        labels,
        label_column,
        parameters,
        folder,
        lambda x, y: self.update_state(state='PROGRESS', meta={'current': x, 'total': y})
    )
    return {}

def revoke_task(task_id):
    revoke(task_id, terminate=True)

def get_task_status(task_id):
    """Gets a given's task and returns a summary in JSON format"""

    task = queue_training.AsyncResult(task_id)
    if task.state == 'PENDING':
        response = {
            'state': task.state,
            'current': 0,
            'total': 1
        }
    elif task.state != 'FAILURE':
        response = {'state': task.state}

        if isinstance(task.info, dict):
            response.update({
                'current': task.info.get('current', 0),
                'total': task.info.get('total', 1),
                'status': task.info.get('status', '')
            })
    else:
        # something went wrong in the background job
        response = {
            'state': task.state,
            'current': 1,
            'total': 1,
            'status': str(task.info),
        }

    return response

@worker_process_init.connect
def fix_multiprocessing(**_):
    """
    This turns off daemon mode for celery processes.
    https://stackoverflow.com/questions/46443541/process-is-not-spawning-with-multiprocessing-module-in-celery
    """

    from multiprocessing import current_process
    current_process().daemon = False
