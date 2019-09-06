#%%
# Auto ML
#
# Supervised learning using an exhaustive search of ideal pre-processing (if any), algorithms,
# and hyper-parameters with feature engineering.

# Dependencies
import os
import itertools
import warnings
from dotenv import load_dotenv

from estimators import estimatorNames
from feature_selection import featureSelectorNames

from generalization import generalize
from model import generateModel
from import_data import importData
from pipeline import generatePipeline
from scalers import scalerNames
from scorers import scorerNames

# Load environment variables
load_dotenv()
IGNORE_ESTIMATOR = os.getenv('IGNORE_ESTIMATOR').split(',')
IGNORE_FEATURE_SELECTOR = os.getenv('IGNORE_FEATURE_SELECTOR').split(',')
IGNORE_SCALER = os.getenv('IGNORE_SCALER').split(',')
IGNORE_SCORER = os.getenv('IGNORE_SCORER').split(',')

# Hide warning from the output
warnings.filterwarnings('ignore')

# Define the labels for our classes
# This is used for the classification reproting (more readable then 0/1)
labels = ['No AKI', 'AKI']
labelColumn = 'AKI'

# Import data
data, data_test, X, Y, X2, Y2, X_train, X_test, Y_train, Y_test = importData('data/train.csv', 'data/test.csv', labelColumn)

#%%
# Generate all models
models = {}
for estimator, featureSelector, scaler, scorer in list(itertools.product(*[estimatorNames, featureSelectorNames, scalerNames, scorerNames])):
    if estimator in IGNORE_ESTIMATOR or featureSelector in IGNORE_FEATURE_SELECTOR or scaler in IGNORE_SCALER or scorer in IGNORE_SCORER:
        continue

    if not scaler in models:
        models[scaler] = {}
    
    if not featureSelector in models[scaler]:
        models[scaler][featureSelector] = {}

    print('Generating ' + estimatorNames[estimator] + ' model (scoring: ' + scorerNames[scorer] + ') with ' + scalerNames[scaler] + ' and with ' + featureSelectorNames[featureSelector])
    pipeline = generatePipeline(scaler, featureSelector, estimator, scorer)
    models[scaler][featureSelector][estimator] = generateModel(estimator, pipeline, X_train, Y_train, X, Y, X2, Y2, labels, scorer)
    generalize(models[scaler][featureSelector][estimator], scaler, X_train, X2, Y2, labels)


#%%
