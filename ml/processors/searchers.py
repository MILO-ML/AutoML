"""
All hyper-parameter search methods
"""

import os

import pandas as pd
from dotenv import load_dotenv

from sklearn.model_selection import GridSearchCV, ParameterGrid, RandomizedSearchCV, StratifiedKFold

from .estimators import ESTIMATORS
from .hyperparameters import HYPER_PARAMETER_RANGE

load_dotenv()
SHUFFLE = False if os.getenv('IGNORE_SHUFFLE', '') != '' else True

# Define the max iterations for random
MAX_RANDOM_ITERATIONS = 100

# Define the number of splits for the cross validator
N_SPLITS = 10

def make_grid_search(estimator, scoring, shuffle, custom_hyper_parameters, _):
    """Generate grid search with 10 fold cross validator"""

    # Define the cross validator (shuffle the data between each fold)
    # This reduces correlation between outcome and train data order.
    cv = StratifiedKFold(n_splits=N_SPLITS, shuffle=shuffle)

    if custom_hyper_parameters is not None and\
        'grid' in custom_hyper_parameters and\
        estimator in custom_hyper_parameters['grid']:
        parameter_range = custom_hyper_parameters['grid'][estimator]
    else:
        parameter_range = HYPER_PARAMETER_RANGE['grid'][estimator]\
            if estimator in HYPER_PARAMETER_RANGE['grid'] else {}

    return (
        GridSearchCV(
            ESTIMATORS[estimator],
            parameter_range,
            cv=cv,
            scoring=scoring,
            refit=False,
            n_jobs=-1,
            iid=True,
            return_train_score=False
        ),
        len(list(ParameterGrid(parameter_range))) *\
            cv.get_n_splits()
    )

def make_random_search(estimator, scoring, shuffle, custom_hyper_parameters, y_train):
    """Generate random search with defined max iterations"""

    # Define the cross validator (shuffle the data between each fold)
    # This reduces correlation between outcome and train data order.
    cv = StratifiedKFold(n_splits=N_SPLITS, shuffle=shuffle)

    if custom_hyper_parameters is not None and\
        'random' in custom_hyper_parameters and\
        estimator in custom_hyper_parameters['random']:
        parameter_range = custom_hyper_parameters['random'][estimator]
    else:
        parameter_range = HYPER_PARAMETER_RANGE['random'][estimator]\
            if estimator in HYPER_PARAMETER_RANGE['random'] else {}

    if callable(parameter_range):
        parameter_range = parameter_range(pd.Series(y_train).value_counts().min())

    # When the grid contains an RVS method, the parameter grid cannot generate
    # an exhaustive list and throws an error. In this case, iterate the max
    # count allowed.
    try:
        total_range = len(list(ParameterGrid(parameter_range)))
        iterations = total_range if MAX_RANDOM_ITERATIONS >= total_range else MAX_RANDOM_ITERATIONS
    except:
        iterations = MAX_RANDOM_ITERATIONS

    return (
        RandomizedSearchCV(
            ESTIMATORS[estimator],
            parameter_range,
            cv=cv,
            scoring=scoring,
            refit=False,
            n_iter=iterations,
            n_jobs=-1,
            iid=True,
            return_train_score=False
        ),
        iterations * cv.get_n_splits()
    )

SEARCHERS = {
    'grid': make_grid_search,
    'random': make_random_search
}

SEARCHER_NAMES = {
    'grid': 'grid search',
    'random': 'random search'
}
