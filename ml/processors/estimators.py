"""
Defines all estimators used
"""

from sklearn.svm import SVC
from sklearn.naive_bayes import GaussianNB
from sklearn.linear_model import LogisticRegression
from sklearn.neural_network import MLPClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.neighbors import KNeighborsClassifier
from xgboost import XGBClassifier

ESTIMATORS = {
    'gb': XGBClassifier(),
    'knn': KNeighborsClassifier(),
    'lr': LogisticRegression(solver='lbfgs', max_iter=1000),
    'mlp': MLPClassifier(),
    'nb': GaussianNB(),
    'rf': RandomForestClassifier(n_estimators=10),
    'svm': SVC(gamma='auto', probability=True),
}

ESTIMATOR_NAMES = {
    'gb': 'gradient boosting machine',
    'knn': 'K-nearest neighbor',
    'lr': 'logistic regression',
    'mlp': 'neural network',
    'nb': 'naive Bayes',
    'rf': 'random forest',
    'svm': 'support vector machine'
}
