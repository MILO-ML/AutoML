"""
Import data and process/clean data
"""

import pandas as pd
import numpy as np

from sklearn.model_selection import train_test_split

def import_data(train_path, test_path, label_column):
    """Import both the training and test data using the passed paths"""

    x, y, feature_names, train_negative_count, train_positive_count = import_csv(train_path, label_column, True)
    x2, y2, _, test_negative_count, test_positive_count = import_csv(test_path, label_column)

    metadata = {
        'train_negative_count': train_negative_count,
        'train_positive_count': train_positive_count,
        'test_negative_count': test_negative_count,
        'test_positive_count': test_positive_count
    }

    return train_test_split(x, y, test_size=.2, random_state=5, stratify=y) + \
        [x2, y2, feature_names, metadata]

def import_train(train_path, label_column):
    """Import training data using the passed path"""

    x, y, feature_names, negative_count, positive_count = import_csv(train_path, label_column, True)
    return train_test_split(x, y, test_size=.2, random_state=5, stratify=y) + [feature_names]

def import_csv(path, label_column, show_warning=False):
    """Import the specificed sheet"""

    # Read the CSV to memory and drop rows with empty values
    data = pd.read_csv(path).dropna()

    # Drop the label column from the data
    x = data.drop(label_column, axis=1)

    # Save the label colum values
    y = data[label_column]

    # Remove rows which contain data that is not an integer or float value
    x = x.loc[:, (x.dtypes == np.int64) | (x.dtypes == np.float64)].dropna()

    # Grab the feature names
    feature_names = list(x)

    # Convert to NumPy array
    x = x.to_numpy()

    negative_count = data[data[label_column] == 0].shape[0]
    positive_count = data[data[label_column] == 1].shape[0]

    if show_warning:
        print('Negative Cases: %.7g\nPositive Cases: %.7g\n' % (negative_count, positive_count))

        if negative_count / positive_count < .9:
            print('Warning: Classes are not balanced.')

    return [x, y, feature_names, negative_count, positive_count]
