"""
Creates the model based on the pipeline components (provided by
the key, hyper parameters and features used).
"""

import os
import numpy as np
from joblib import dump
from nyoka import skl_to_pmml, xgboost_to_pmml
from sklearn.pipeline import Pipeline

from .processors.estimators import ESTIMATORS
from .processors.feature_selection import FEATURE_SELECTORS
from .processors.scalers import SCALERS
from .import_data import import_train
from .utils import explode_key

def create_model(key, hyper_parameters, selected_features, train_set=None, label_column=None, output_path='.'):
    """Refits the requested model and pickles it for export"""

    if train_set is None:
        print('Missing training data')
        return {}

    if label_column is None:
        print('Missing column name for classifier target')
        return {}

    # Import data
    (x_train, _, y_train, _, features) = import_train(train_set, label_column)

    # Get pipeline details from the key
    scaler, feature_selector, estimator, _, _ = explode_key(key)
    steps = []

    # Drop the unused features
    if 'pca-' not in feature_selector:
        for index, feature in reversed(list(enumerate(features))):
            if feature not in selected_features:
                x_train = np.delete(x_train, index, axis=1)

    # Add the scaler, if used
    if scaler and SCALERS[scaler]:
        steps.append(('scaler', SCALERS[scaler]))

    # Add the feature transformer
    if 'pca-' in feature_selector:
        steps.append(('feature_selector', FEATURE_SELECTORS[feature_selector]))

    # Add the estimator
    steps.append(('estimator', ESTIMATORS[estimator].set_params(**hyper_parameters)))

    # Fit the pipeline using the same training data
    pipeline = Pipeline(steps).fit(x_train, y_train)

    # Dump the pipeline to a file
    dump(pipeline, output_path + '/pipeline.joblib')

    # Export the model as a PMML
    try:
        if estimator == 'gb':
            xgboost_to_pmml(pipeline, selected_features, label_column, output_path + '/pipeline.pmml')
        else:
            skl_to_pmml(pipeline, selected_features, label_column, output_path + '/pipeline.pmml')
    except:
        try:
            os.remove(output_path + '/pipeline.pmml')
        except:
            pass

    return pipeline
