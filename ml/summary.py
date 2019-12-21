"""
Generate final summary
"""

import pandas as pd

from .utils import model_key_to_name

pd.set_option('display.max_colwidth', -1)
pd.set_option('display.max_columns', None)

def print_summary(results):
    """Prints the final summary"""

    if not results:
        return

    results = sorted(results,
                     key=lambda x: (x['auc'], x['sensitivity'], x['f1']), reverse=True)

    print('Best model:', model_key_to_name(results[0]['key']), '\n')
