"""
Utilities
"""
from operators.estimators import ESTIMATOR_NAMES
from operators.feature_selection import FEATURE_SELECTOR_NAMES
from operators.scalers import SCALER_NAMES
from operators.scorers import SCORER_NAMES

def model_key_to_name(key):
    """"Resolve key name to descriptive name"""

    scaler, feature_selector, estimator, scorer = key.split('__')
    return ESTIMATOR_NAMES[estimator] + ' model using ' + SCORER_NAMES[scorer] +\
        ' scored grid search with ' + SCALER_NAMES[scaler] + ' and with ' +\
        FEATURE_SELECTOR_NAMES[feature_selector]
