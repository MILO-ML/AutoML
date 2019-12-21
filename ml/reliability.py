"""
Compute reliability curve and Briar score
"""

from sklearn.calibration import calibration_curve
from sklearn.metrics import brier_score_loss

from .preprocess import preprocess

def reliability(pipeline, model, x_test, y_test):
    """Compute reliability curve and Briar score"""

    # Transform values based on the pipeline
    x_test = preprocess(model['features'], pipeline, x_test)

    if hasattr(model['best_estimator'], 'decision_function'):
        probabilities = model['best_estimator'].decision_function(x_test)
        probabilities = (probabilities - probabilities.min()) / \
            (probabilities.max() - probabilities.min())
    else:
        probabilities = model['best_estimator'].predict_proba(x_test)[:, 1]

    fop, mpv = calibration_curve(y_test, probabilities, n_bins=10)
    brier_score = brier_score_loss(y_test, probabilities)

    return {
        'brier_score': brier_score,
        'fop': list(fop),
        'mpv': list(mpv)
    }
