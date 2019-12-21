"""
All feature selectors
"""

from sklearn.feature_selection import SelectPercentile
from sklearn.decomposition import PCA

from .rffi import RandomForestFeatureImportanceSelector

FEATURE_SELECTORS = {
    'none': '',
    'pca-80': PCA(n_components=.80, svd_solver='full'),
    'pca-90': PCA(n_components=.90, svd_solver='full'),
    'rf-25': RandomForestFeatureImportanceSelector(percentile=.25),
    'rf-50': RandomForestFeatureImportanceSelector(percentile=.50),
    'rf-75': RandomForestFeatureImportanceSelector(percentile=.75),
    'select-25': SelectPercentile(percentile=25),
    'select-50': SelectPercentile(percentile=50),
    'select-75': SelectPercentile(percentile=75)
}

FEATURE_SELECTOR_NAMES = {
    'none': 'all features (no feature selection)',
    'pca-80': 'principal component analysis (80%)',
    'pca-90': 'principal component analysis (90%)',
    'rf-25': 'random forest importance (25%)',
    'rf-50': 'random forest importance (50%)',
    'rf-75': 'random forest importance (75%)',
    'select-25': 'select percentile (25%)',
    'select-50': 'select percentile (50%)',
    'select-75': 'select percentile (75%)'
}
