"""
Refit a model based on the provided parameters
and score it against the test set for the provided
scoring method.
"""

import json
from sklearn.base import clone

from .processors.estimators import ESTIMATORS
from .processors.scorers import SCORER_NAMES
from .preprocess import preprocess

def refit_model(pipeline, features, estimator, scoring, x_train, y_train):
    """
    Determine the best model based on the provided scoring method
    and the fitting pipeline results.
    """

    # Transform values based on the pipeline
    x_train = preprocess(features, pipeline, x_train)

    results = pipeline.named_steps['estimator'].cv_results_

    best_index_ = results['rank_test_%s' % scoring].argmin()
    best_score_ = results['mean_test_%s' % scoring][best_index_]
    best_params_ = results['params'][best_index_]

    print('\tBest %s: %.7g (sd=%.7g)'
          % (SCORER_NAMES[scoring], best_score_,\
                results['std_test_%s' % scoring][best_index_]))
    print('\tBest %s parameters:' % SCORER_NAMES[scoring],
          json.dumps(best_params_, indent=4, sort_keys=True).replace('\n', '\n\t'))

    model = clone(ESTIMATORS[estimator]).set_params(**best_params_).fit(x_train, y_train)

    return {
        'best_estimator': model,
        'best_params': best_params_
    }
