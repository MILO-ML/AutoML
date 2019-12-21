"""
Implements Random Forest Feature Importance as a pipeline step
"""

import math
from sklearn.base import TransformerMixin, BaseEstimator

from .estimators import ESTIMATORS

class RandomForestFeatureImportanceSelector(BaseEstimator, TransformerMixin):
    """Pipeline step class"""

    def __init__(self, percentile=.8):
        self.model = ESTIMATORS['rf']
        self.percentile = percentile
        self.total = 1

    def fit(self, *args, **kwargs):
        """Fit the model with the data"""

        self.model.fit(*args, **kwargs)
        return self

    def transform(self, x):
        """Drop the 'unimportant' features"""

        total = math.floor(self.percentile * x.shape[1])
        self.total = total if total > 1 else 1
        return x[:, self.get_top_features()]

    def get_top_features(self):
        """Output the top features"""

        return self.model.feature_importances_.argsort()[::-1][:self.total]
