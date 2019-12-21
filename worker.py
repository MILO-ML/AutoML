import os
import ast
import json
import time

from celery import Celery
from celery.signals import after_task_publish, task_prerun, task_postrun
from celery.task.control import revoke

from api import api

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
            except:
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

    os.environ['IGNORE_ESTIMATOR'] = parameters['ignore_estimator']
    os.environ['IGNORE_FEATURE_SELECTOR'] = parameters['ignore_feature_selector']
    os.environ['IGNORE_SCALER'] = parameters['ignore_scaler']
    os.environ['IGNORE_SEARCHER'] = parameters['ignore_searcher']
    os.environ['IGNORE_SCORER'] = parameters['ignore_scorer']
    if 'ignore_shuffle' in parameters:
        os.environ['IGNORE_SHUFFLE'] = parameters['ignore_shuffle']

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
        folder,
        lambda x, y: self.update_state(state='PROGRESS', meta={'current': x, 'total': y}),
        parameters['hyper_parameters'] if 'hyper_parameters' in parameters else None
    )
    return {}

def revoke_task(task_id):
    revoke(task_id, terminate=True)

def get_pending_tasks():
    with open('.tasks.json') as tasks_file:
        try:
            tasks = json.load(tasks_file)
        except:
            tasks = {}
    return tasks

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

            if 'result' in task.info:
                response['result'] = task.info['result']
    else:
        # something went wrong in the background job
        response = {
            'state': task.state,
            'current': 1,
            'total': 1,
            'status': str(task.info),  # this is the exception raised
        }

    return response

@after_task_publish.connect
def after_task_publish_handler(sender=None, headers=None, body=None, **kwargs):
    info = headers if 'task' in headers else body

    with open('.tasks.json', 'a+') as tasks_file:
        tasks_file.seek(0)

        try:
            tasks = json.load(tasks_file)
        except:
            tasks = {}

        tasks[info['id']] = {
            'args': ast.literal_eval(info['argsrepr']),
            'status': {'state': 'PENDING'}
        }
        tasks_file.seek(0)
        tasks_file.truncate()
        json.dump(tasks, tasks_file)

@task_prerun.connect
def task_prerun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, **kwds):
    with open('.tasks.json', 'a+') as tasks_file:
        tasks_file.seek(0)

        try:
            tasks = json.load(tasks_file)
        except:
            tasks = {}

        tasks[task_id] = {
            'args': args,
            'time': time.time(),
            'status': {'state': 'PENDING'}
        }
        tasks_file.seek(0)
        tasks_file.truncate()
        json.dump(tasks, tasks_file)

@task_postrun.connect
def task_postrun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, **kwds):
    with open('.tasks.json', 'a+') as tasks_file:
        tasks_file.seek(0)

        try:
            tasks = json.load(tasks_file)
        except:
            tasks = {}

        del tasks[task_id]
        tasks_file.seek(0)
        tasks_file.truncate()
        json.dump(tasks, tasks_file)
