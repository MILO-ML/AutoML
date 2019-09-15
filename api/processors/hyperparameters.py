"""
Define hyper-parameter ranges for grid search
"""

from scipy.stats import randint, uniform

HYPER_PARAMETER_RANGE = {
    'grid': {
        'gb': {
            'learning_rate': [0.1, 0.05, 0.02, 0.01],
            'max_depth': [4, 6, 8],
            'min_samples_leaf': [20, 50, 100, 150],
            'max_features': [1.0, 0.3, 0.1]
        },
        'knn': [
            {
                'n_neighbors': list(range(1, 31)),
                'weights': ['uniform']
            },
            {
                'n_neighbors': list(range(1, 31)),
                'weights': ['distance']
            }
        ],
        'lr': {
            'C': [.01, .1, 1, 2, 3, 4, 5, 10, 100],
            'solver': ['lbfgs'],
            'max_iter': [100, 200, 500]
        },
        'mlp': [
            {
                'max_iter': [300, 400],
                'activation': ['tanh'],
                'learning_rate': ['constant', 'adaptive'],
                'alpha': [.0001, .0005],
                'tol': [.005, .0001],
                'hidden_layer_sizes': [(10,), (20,), (50,), (100,), (200,), (10, 10, 10)]
            },
            {
                'max_iter': [300, 400],
                'activation': ['relu'],
                'learning_rate': ['constant', 'adaptive'],
                'alpha': [.0001, .0005],
                'tol': [.005, .0001],
                'hidden_layer_sizes': [(10,), (20,), (50,), (100,), (200,), (10, 10, 10)]
            }
        ],
        'rf': {
            'bootstrap': [True],
            'max_depth': [50, 80, 110],
            'max_features': ['auto'],
            'min_samples_leaf': [3, 4, 5],
            'min_samples_split': [2, 3, 4],
            'n_estimators': [10, 100, 200, 300, 1000]
        },
        'svm': {
            'C': [.1, 1, 10, 100, 1000],
            'kernel': ['rbf'],
            'gamma': [1, .1, .5, .01, .05, .001, .005, .0001]
        }
    },
    'random': {
        'mlp': {
            'max_iter': [300, 400],
            'activation': ['tanh', 'relu'],
            'learning_rate': ['constant', 'adaptive'],
            'alpha': uniform(loc=0, scale=4),
            'tol': uniform(0.0001,0.005),
            'hidden_layer_sizes': [(50,), (100,), (5, 5), (7, 7), (3, 3, 3), (5, 5, 5)],
            'n_iter_no_change': (3, 5, 10)
        },
        'svm': {
            'C': randint(1, 20),
            'kernel': ['rbf','poly','sigmoid'],
            'gamma': uniform(loc=0, scale=4)
        }
    }
}
