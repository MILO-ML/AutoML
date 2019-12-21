"""
Generates a pipeline
"""

from sklearn.pipeline import Pipeline

from .processors.debug import Debug
from .processors.feature_selection import FEATURE_SELECTORS
from .processors.roc_auc_scorer import ROCAUCScorer
from .processors.scalers import SCALERS
from .processors.searchers import SEARCHERS

# Generate a pipeline
def generate_pipeline(
        scaler,
        feature_selector,
        estimator,
        y_train,
        scoring=None,
        searcher='grid',
        shuffle=True,
        custom_hyper_parameters=None
    ):
    """Generate the pipeline based on incoming arguments"""

    steps = []
    auc_scorer = None

    if scaler and SCALERS[scaler]:
        steps.append(('scaler', SCALERS[scaler]))

    if feature_selector and FEATURE_SELECTORS[feature_selector]:
        steps.append(('feature_selector', FEATURE_SELECTORS[feature_selector]))

    steps.append(('debug', Debug()))

    if not scoring:
        scoring = ['accuracy']

    scorers = {}
    for scorer in scoring:
        if scorer == 'roc_auc':
            auc_scorer = ROCAUCScorer()
            scorers[scorer] = auc_scorer.get_scorer()
        else:
            scorers[scorer] = scorer

    search_step = SEARCHERS[searcher](estimator, scorers, shuffle, custom_hyper_parameters, y_train)

    steps.append(('estimator', search_step[0]))

    return (Pipeline(steps), search_step[1], auc_scorer)
