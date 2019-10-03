"""
Generate models
"""

import json
from timeit import default_timer as timer

import pandas as pd
import numpy as np

from .processors.scorers import SCORER_NAMES

MAX_FEATURES_SHOWN = 5

def generate_model(pipeline, feature_names, x_train, y_train, scoring='accuracy'):
    """Define the generic method to generate the best model for the provided estimator"""
    start = timer()
    pipeline.fit(x_train, y_train)

    best_params = performance = features = {}

    if 'feature_selector' in pipeline.named_steps:
        feature_selector_type = pipeline.named_steps['feature_selector'].__class__.__module__

        if 'sklearn.feature_selection.univariate_selection' in feature_selector_type:
            features = pd.Series(pipeline.named_steps['feature_selector'].get_support(),
                                 index=feature_names)
            selected_features = features[features == True].axes[0]

        elif 'processors.rffi' in feature_selector_type:
            most_important = pipeline.named_steps['feature_selector'].get_top_features()
            most_important_names =\
                [feature_names[most_important[i]] for i in range(len(most_important))]
            features = pd.Series((i in most_important_names for i in feature_names),
                                 index=feature_names)
            selected_features = features[features == True].axes[0]
        else:
            selected_features = feature_names
    else:
        selected_features = feature_names

    print('\tFeatures used: ' + ', '.join(selected_features[:MAX_FEATURES_SHOWN]) +
          ('...' if len(selected_features) > MAX_FEATURES_SHOWN else ''))

    if hasattr(pipeline.named_steps['estimator'], 'cv_results_'):
        performance = pd.DataFrame(
            pipeline.named_steps['estimator'].cv_results_
        )[['mean_test_score', 'std_test_score']].sort_values(by='mean_test_score', ascending=False)
        model_best = pipeline.named_steps['estimator'].best_estimator_
        best_params = pipeline.named_steps['estimator'].best_params_

        print('\tBest %s: %.7g (sd=%.7g)'
              % (SCORER_NAMES[scoring], performance.iloc[0]['mean_test_score'],
                 performance.iloc[0]['std_test_score']))
        print('\tBest parameters:',
              json.dumps(best_params, indent=4, sort_keys=True).replace('\n', '\n\t'))
    else:
        print('\tNo hyper-parameters to tune for this estimator\n')
        model_best = pipeline.named_steps['estimator']

    train_time = timer() - start
    print('\tTraining time is {:.4f} seconds'.format(train_time), '\n')

    return {
        'best_estimator': model_best,
        'best_params': best_params,
        'best_score': (performance.iloc[0]['mean_test_score'],
                       performance.iloc[0]['std_test_score']) if 'iloc' in performance else None,
        'performance': performance,
        'features': features,
        'selected_features': selected_features,
        'train_time': train_time
    }
