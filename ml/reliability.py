"""
Compute reliability curve and Briar score
"""

import numpy as np
import pandas as pd
from joblib import load

from sklearn.calibration import calibration_curve
from sklearn.metrics import brier_score_loss

from .preprocess import preprocess

def reliability(pipeline, features, model, x_test, y_test):
    """Compute reliability curve and Briar score"""

    # Transform values based on the pipeline
    x_test = preprocess(features, pipeline, x_test)

    if hasattr(model, 'decision_function'):
        probabilities = model.decision_function(x_test)

        if np.count_nonzero(probabilities):
            if probabilities.max() - probabilities.min() == 0:
                probabilities = [0] * len(probabilities)
            else:
                probabilities = (probabilities - probabilities.min()) / \
                    (probabilities.max() - probabilities.min())
    else:
        probabilities = model.predict_proba(x_test)[:, 1]

    fop, mpv = calibration_curve(y_test, probabilities, n_bins=10, strategy='uniform')
    brier_score = brier_score_loss(y_test, probabilities)

    return {
        'brier_score': round(brier_score, 4),
        'fop': [round(num, 4) for num in list(fop)],
        'mpv': [round(num, 4) for num in list(mpv)]
    }

def additional_reliability(payload, label, folder):
    data = pd.DataFrame(payload['data'], columns=payload['columns']).apply(pd.to_numeric, errors='coerce').dropna()
    x = data[payload['features']].to_numpy()
    y = data[label]

    pipeline = load(folder + '.joblib')

    return reliability(pipeline, payload['features'], pipeline.steps[-1][1], x, y)
