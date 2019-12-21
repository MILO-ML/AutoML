"""
Custom ROC AUC scorer which keeps track of the
FPR/TPR per fold and returns the mean and
standard deviation
"""

from multiprocessing import Manager

import numpy as np
from scipy import interp
from sklearn.preprocessing import label_binarize
from sklearn.metrics import auc, make_scorer, roc_curve
from sklearn.metrics.base import _average_binary_score

class ROCAUCScorer:
    """
    Class which initializes with an empty tpr array
    """

    def __init__(self):
        """Initializes the class"""

        manager = Manager()
        self.tprs = manager.list()
        self.aucs = manager.list()
        self.mean_fpr = np.linspace(0, 1, 100)

    def get_scorer(self):
        """Returns the SKLearn scorer"""

        return make_scorer(self.roc_auc_score)

    def get_mean(self):
        mean_tpr = np.mean(self.tprs, axis=0)
        mean_tpr[-1] = 1.0
        std_tpr = np.std(self.tprs, axis=0)

        return {
            'std_auc': np.std(self.aucs),
            'mean_fpr': list(np.around(self.mean_fpr, decimals=2)),
            'mean_tpr': list(np.around(mean_tpr, decimals=2)),
            'mean_upper': list(np.around(np.minimum(mean_tpr + std_tpr, 1), decimals=2)),
            'mean_lower': list(np.around(np.maximum(mean_tpr - std_tpr, 0), decimals=2))
        }

    def roc_auc_score(self, y_true, y_score, average='macro', sample_weight=None):
        """
        Compute Area Under the Receiver Operating Characteristic Curve (ROC AUC)
        from prediction scores.
        """
        def _binary_roc_auc_score(y_true, y_score, sample_weight=None):
            if len(np.unique(y_true)) != 2:
                raise ValueError("Only one class present in y_true. ROC AUC score "
                                 "is not defined in that case.")

            fpr, tpr, _ = roc_curve(y_true, y_score,
                                    sample_weight=sample_weight)
            tprs = interp(self.mean_fpr, fpr, tpr)
            tprs[0] = 0.0
            roc_auc = auc(fpr, tpr)
            self.tprs.append(tprs)
            self.aucs.append(roc_auc)
            return roc_auc

        labels = np.unique(y_true)
        y_true = label_binarize(y_true, labels)[:, 0]

        return _average_binary_score(_binary_roc_auc_score, y_true, y_score,
                                     average, sample_weight=sample_weight)
