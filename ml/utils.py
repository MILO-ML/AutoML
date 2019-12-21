"""
Utilities
"""

from .processors.estimators import ESTIMATOR_NAMES
from .processors.feature_selection import FEATURE_SELECTOR_NAMES
from .processors.scalers import SCALER_NAMES
from .processors.searchers import SEARCHER_NAMES
from .processors.scorers import SCORER_NAMES

def model_key_to_name(key):
    """"Resolve key name to descriptive name"""

    scaler, feature_selector, estimator, searcher, scorer = explode_key(key)
    search = 'cross validation' if estimator == 'nb' else SEARCHER_NAMES[searcher]
    if scorer:
        search = SCORER_NAMES[scorer] + ' scored ' + search

    return ESTIMATOR_NAMES[estimator] + ' model using ' + search + ' with ' +\
        SCALER_NAMES[scaler] + ' and with ' + FEATURE_SELECTOR_NAMES[feature_selector]

def explode_key(key):
    """Split apart a key into it's separate components"""

    return (key.split('__') + [None])[:5]
