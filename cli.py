"""
AutoML

Interact with the trainer using the CLI
"""
import sys

from ml import api

# Parse input or load sample data
if len(sys.argv) < 4:
    TRAIN_SET = 'sample-data/train.csv'
    TEST_SET = 'sample-data/test.csv'
    LABEL_COLUMN = 'AKI'
else:
    TRAIN_SET = sys.argv[1]
    TEST_SET = sys.argv[2]
    LABEL_COLUMN = sys.argv[3]

LABELS = ['No ' + LABEL_COLUMN, LABEL_COLUMN]

api.find_best_model(TRAIN_SET, TEST_SET, LABELS, LABEL_COLUMN)
