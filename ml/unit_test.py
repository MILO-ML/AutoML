"""
Unit Tests
"""

import os

from .import_data import import_data
from .generalization import generalize
from .model import generate_model
from .pipeline import generate_pipeline
from .refit import refit_model

# Load the test data
LABEL_COLUMN = 'AKI'

# Import data
X_TRAIN, X_TEST, Y_TRAIN, Y_TEST, X2, Y2, FEATURE_NAMES, _ = import_data(
    'sample-data/train.csv', 'sample-data/test.csv', LABEL_COLUMN)

def test_logistic_regression():
    """Test LR"""

    pipeline = generate_pipeline('none', 'none', 'lr', Y_TRAIN, None, 'grid', False)
    model = generate_model(pipeline[0], FEATURE_NAMES, X_TRAIN, Y_TRAIN)
    model.update(refit_model(pipeline[0], model['features'], 'lr', 'accuracy', X_TRAIN, Y_TRAIN))
    generalization = generalize(model, pipeline[0], X2, Y2)
    assert generalization['accuracy'] == 0.37254901960784315
    assert generalization['auc'] == 0.6
    assert generalization['f1'] == 0.3703703703703704
    assert generalization['sensitivity'] == 1.0
    assert generalization['specificity'] == 0.2

def test_logistic_regression_with_standard_scaler():
    """Test LR with Standard Scaler"""

    pipeline = generate_pipeline('std', 'none', 'lr', Y_TRAIN, None, 'grid', False)
    model = generate_model(pipeline[0], FEATURE_NAMES, X_TRAIN, Y_TRAIN)
    model.update(refit_model(pipeline[0], model['features'], 'lr', 'accuracy', X_TRAIN, Y_TRAIN))
    generalization = generalize(model, pipeline[0], X2, Y2)
    assert generalization['accuracy'] == 0.49019607843137253
    assert generalization['auc'] == 0.675
    assert generalization['f1'] == 0.48842592592592593
    assert generalization['sensitivity'] == 1.0
    assert generalization['specificity'] == 0.35

def test_logistic_regression_with_standard_scaler_with_select_75():
    """Test LR with standard scaler and select percentile 75"""

    pipeline = generate_pipeline('std', 'select-75', 'lr', Y_TRAIN, None, 'grid', False)
    model = generate_model(pipeline[0], FEATURE_NAMES, X_TRAIN, Y_TRAIN)
    model.update(refit_model(pipeline[0], model['features'], 'lr', 'accuracy', X_TRAIN, Y_TRAIN))
    generalization = generalize(model, pipeline[0], X2, Y2)
    assert generalization['accuracy'] == 0.35294117647058826
    assert generalization['auc'] == 0.5875
    assert generalization['f1'] == 0.34893617021276596
    assert generalization['sensitivity'] == 1.0
    assert generalization['specificity'] == 0.175

def test_k_nearest_neighbor():
    """Test KNN"""

    pipeline = generate_pipeline('none', 'none', 'knn', Y_TRAIN, None, 'grid', False)
    model = generate_model(pipeline[0], FEATURE_NAMES, X_TRAIN, Y_TRAIN)
    model.update(refit_model(pipeline[0], model['features'], 'knn', 'accuracy', X_TRAIN, Y_TRAIN))
    generalization = generalize(model, pipeline[0], X2, Y2)
    assert generalization['accuracy'] == 0.39215686274509803
    assert generalization['auc'] == 0.6125
    assert generalization['f1'] == 0.39122063919907585
    assert generalization['sensitivity'] == 1.0
    assert generalization['specificity'] == 0.225

def test_k_nearest_neighbor_with_standard_scaler():
    """Test KNN with standard scaler"""

    pipeline = generate_pipeline('std', 'none', 'knn', Y_TRAIN, None, 'grid', False)
    model = generate_model(pipeline[0], FEATURE_NAMES, X_TRAIN, Y_TRAIN)
    model.update(refit_model(pipeline[0], model['features'], 'knn', 'accuracy', X_TRAIN, Y_TRAIN))
    generalization = generalize(model, pipeline[0], X2, Y2)
    assert generalization['accuracy'] == 0.5490196078431373
    assert generalization['auc'] == 0.6795454545454545
    assert generalization['f1'] == 0.5376428852975955
    assert generalization['sensitivity'] == 0.9090909090909091
    assert generalization['specificity'] == 0.45

def test_k_nearest_neighbor_with_standard_scaler_with_select_75():
    """Test KNN with standard scaler and select percentile 75%"""

    pipeline = generate_pipeline('std', 'select-75', 'knn', Y_TRAIN, None, 'grid', False)
    model = generate_model(pipeline[0], FEATURE_NAMES, X_TRAIN, Y_TRAIN)
    model.update(refit_model(pipeline[0], model['features'], 'knn', 'accuracy', X_TRAIN, Y_TRAIN))
    generalization = generalize(model, pipeline[0], X2, Y2)
    assert generalization['accuracy'] == 0.49019607843137253
    assert generalization['auc'] == 0.675
    assert generalization['f1'] == 0.48842592592592593
    assert generalization['sensitivity'] == 1.0
    assert generalization['specificity'] == 0.35

def test_support_vector_machine():
    """Test SVM"""

    pipeline = generate_pipeline('none', 'none', 'svm', Y_TRAIN, None, 'grid', False)
    model = generate_model(pipeline[0], FEATURE_NAMES, X_TRAIN, Y_TRAIN)
    model.update(refit_model(pipeline[0], model['features'], 'svm', 'accuracy', X_TRAIN, Y_TRAIN))
    generalization = generalize(model, pipeline[0], X2, Y2)
    assert generalization['accuracy'] == 0.2549019607843137
    assert generalization['auc'] == 0.4920454545454545
    assert generalization['f1'] == 0.24059561128526644
    assert generalization['sensitivity'] == 0.9090909090909091
    assert generalization['specificity'] == 0.075

def test_support_vector_machine_with_standard_scaler():
    """Test SVM with standard scaler"""

    pipeline = generate_pipeline('std', 'none', 'svm', Y_TRAIN, None, 'grid', False)
    model = generate_model(pipeline[0], FEATURE_NAMES, X_TRAIN, Y_TRAIN)
    model.update(refit_model(pipeline[0], model['features'], 'svm', 'accuracy', X_TRAIN, Y_TRAIN))
    generalization = generalize(model, pipeline[0], X2, Y2)
    assert generalization['accuracy'] == 0.4117647058823529
    assert generalization['auc'] == 0.625
    assert generalization['f1'] == 0.4115384615384615
    assert generalization['sensitivity'] == 1.0
    assert generalization['specificity'] == 0.25

def test_support_vector_machine_with_standard_scaler_and_roc_auc():
    """Test SVM with standard scaler and ROC AUC scoring"""

    pipeline = generate_pipeline('std', 'none', 'svm', Y_TRAIN, ['roc_auc'], 'grid', False)
    model = generate_model(pipeline[0], FEATURE_NAMES, X_TRAIN, Y_TRAIN)
    model.update(refit_model(pipeline[0], model['features'], 'svm', 'roc_auc', X_TRAIN, Y_TRAIN))
    generalization = generalize(model, pipeline[0], X2, Y2)
    assert generalization['accuracy'] == 0.4117647058823529
    assert generalization['auc'] == 0.625
    assert generalization['f1'] == 0.4115384615384615
    assert generalization['sensitivity'] == 1.0
    assert generalization['specificity'] == 0.25

def test_support_vector_machine_with_standard_scaler_with_select_75():
    """Test SVM with standard scaler and select percentile 75%"""

    pipeline = generate_pipeline('std', 'select-75', 'svm', Y_TRAIN, None, 'grid', False)
    model = generate_model(pipeline[0], FEATURE_NAMES, X_TRAIN, Y_TRAIN)
    model.update(refit_model(pipeline[0], model['features'], 'svm', 'accuracy', X_TRAIN, Y_TRAIN))
    generalization = generalize(model, pipeline[0], X2, Y2)
    assert generalization['accuracy'] == 0.23529411764705882
    assert generalization['auc'] == 0.5125
    assert generalization['f1'] == 0.20471811275489804
    assert generalization['sensitivity'] == 1.0
    assert generalization['specificity'] == 0.025
