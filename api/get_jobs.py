"""
Gets a users uploaded jobs
"""

import os
import json

def get_user_jobs(userid):
    """Get a users uploaded jobs"""

    folder = folder = 'data/' + userid

    if not os.path.exists(folder):
        return False

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

    return jobs
