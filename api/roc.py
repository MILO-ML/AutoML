"""
Compute receiver operating characteristic
"""

from sklearn.metrics import roc_curve

from .preprocess import preprocess

def roc(pipeline, model, x_test, y_test):
    """Generate the ROC values"""

    # Transform values based on the pipeline
    x_test = preprocess(model['features'], pipeline, x_test)

    probabilities = model['best_estimator'].predict_proba(x_test)
    fpr, tpr, _ = roc_curve(y_test, probabilities[:, 1])

    return {
        'test_fpr': list(fpr),
        'test_tpr': list(tpr)
    }
