"""
Pipeline step which outputs shape of data passing through
"""

from sklearn.base import TransformerMixin, BaseEstimator

class Debug(BaseEstimator, TransformerMixin):
    """Base class"""

    #pylint: disable = no-self-use
    def transform(self, x):
        """Show data passing through"""

        print('\tNumber of items: %d\n\tNumber of features: %d' % (x.shape[0], x.shape[1]))
        return x

    #pylint: disable = unused-argument
    def fit(self, x, y=None, **fit_params):
        """Do nothing"""

        return self
