"""
Generate models
"""

import json
from timeit import default_timer as timer

import pandas as pd

MAX_FEATURES_SHOWN = 5

def generate_model(pipeline, feature_names, x_train, y_train):
    """Define the generic method to generate the best model for the provided estimator"""

    start = timer()
    features = {}
    feature_scores = None
    selected_features = feature_names

    pipeline.fit(x_train, y_train)

    if 'feature_selector' in pipeline.named_steps:
        feature_selector_type = pipeline.named_steps['feature_selector'].__class__.__module__

        if 'univariate_selection' in feature_selector_type:
            feature_scores = pipeline.named_steps['feature_selector'].scores_
            feature_scores = pd.DataFrame({'scores': feature_scores, 'selected': pipeline.named_steps['feature_selector'].get_support()}, index=feature_names)
            feature_scores = feature_scores[feature_scores['selected'] == True].drop(columns=['selected'])
            features = pd.Series(pipeline.named_steps['feature_selector'].get_support(),
                                 index=feature_names)
            selected_features = features[features == True].axes[0]

        elif 'processors.rffi' in feature_selector_type:
            most_important = pipeline.named_steps['feature_selector'].get_top_features()
            most_important_names =\
                [feature_names[most_important[i]] for i in range(len(most_important))]
            feature_scores = pipeline.named_steps['feature_selector'].model.feature_importances_
            feature_scores = pd.DataFrame({'scores': feature_scores, 'selected': list(i in most_important_names for i in feature_names)}, index=feature_names)
            feature_scores = feature_scores[feature_scores['selected'] == True].drop(columns=['selected'])
            features = pd.Series((i in most_important_names for i in feature_names),
                                 index=feature_names)
            selected_features = features[features == True].axes[0]

    if feature_scores is not None:
        total_score = feature_scores['scores'].sum()
        feature_scores['scores'] = round(feature_scores['scores'] / total_score, 4)
        feature_scores = json.dumps(dict(feature_scores['scores'].sort_values(ascending=False)))
    else:
        feature_scores = ""

    print('\tFeatures used: ' + ', '.join(selected_features[:MAX_FEATURES_SHOWN]) +
          ('...' if len(selected_features) > MAX_FEATURES_SHOWN else ''))

    train_time = timer() - start
    print('\tTraining time is {:.4f} seconds'.format(train_time), '\n')

    return {
        'features': features,
        'selected_features': selected_features,
        'feature_scores': feature_scores,
        'train_time': train_time
    }
