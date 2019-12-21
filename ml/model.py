"""
Generate models
"""

from timeit import default_timer as timer

import pandas as pd

MAX_FEATURES_SHOWN = 5

def generate_model(pipeline, feature_names, x_train, y_train):
    """Define the generic method to generate the best model for the provided estimator"""

    start = timer()
    features = {}

    pipeline.fit(x_train, y_train)

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

    train_time = timer() - start
    print('\tTraining time is {:.4f} seconds'.format(train_time), '\n')

    return {
        'features': features,
        'selected_features': selected_features
    }
