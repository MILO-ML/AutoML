"""
Unpublishes a model
"""

import os
import json

from flask import jsonify, abort

PUBLISHED_MODELS = 'data/published-models.json'

def unpublish(model):
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