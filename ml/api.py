"""
Auto ML

Supervised learning using an exhaustive search of ideal pre-processing (if any), algorithms,
and hyper-parameters with feature engineering.
"""

# Dependencies
import os
import csv
import json
import time
import itertools

from dotenv import load_dotenv
from sklearn.utils import parallel_backend

from .processors.estimators import ESTIMATOR_NAMES
from .processors.feature_selection import FEATURE_SELECTOR_NAMES
from .processors.scalers import SCALER_NAMES
from .processors.searchers import SEARCHER_NAMES
from .processors.scorers import SCORER_NAMES
from .generalization import generalize
from .model import generate_model
from .import_data import import_data
from .pipeline import generate_pipeline
from .reliability import reliability
from .refit import refit_model
from .roc import roc
from .summary import print_summary
from .utils import model_key_to_name

# Load environment variables
load_dotenv()

def find_best_model(
        train_set=None,
        test_set=None,
        labels=None,
        label_column=None,
        output_path='.',
        update_function=lambda x, y: None,
        custom_hyper_parameters=None
    ):
    """Generates all possible models and outputs the generalization results"""

    ignore_estimator = [x.strip() for x in os.getenv('IGNORE_ESTIMATOR', '').split(',')]
    ignore_feature_selector = \
        [x.strip() for x in os.getenv('IGNORE_FEATURE_SELECTOR', '').split(',')]
    ignore_scaler = [x.strip() for x in os.getenv('IGNORE_SCALER', '').split(',')]
    ignore_searcher = [x.strip() for x in os.getenv('IGNORE_SEARCHER', '').split(',')]
    shuffle = False if os.getenv('IGNORE_SHUFFLE', '') != '' else True
    scorers = [x for x in SCORER_NAMES if x not in \
        [x.strip() for x in os.getenv('IGNORE_SCORER', '').split(',')]]

    if train_set is None:
        print('Missing training data')
        return {}

    if test_set is None:
        print('Missing test data')
        return {}

    if label_column is None:
        print('Missing column name for classifier target')
        return {}

    if custom_hyper_parameters is not None:
        custom_hyper_parameters = json.loads(custom_hyper_parameters)

    # Import data
    (x_train, x_test, y_train, y_test, x2, y2, feature_names, metadata) = \
        import_data(train_set, test_set, label_column)

    results = []
    total_fits = {}

    all_pipelines = list(itertools.product(*[
        filter(lambda x: False if x in ignore_estimator else True, ESTIMATOR_NAMES),
        filter(lambda x: False if x in ignore_feature_selector else True, FEATURE_SELECTOR_NAMES),
        filter(lambda x: False if x in ignore_scaler else True, SCALER_NAMES),
        filter(lambda x: False if x in ignore_searcher else True, SEARCHER_NAMES),
    ]))

    report = open(output_path + '/report.csv', 'w+')
    report_writer = csv.writer(report)

    for index, (estimator, feature_selector, scaler, searcher) in enumerate(all_pipelines):

        # Trigger a callback for task monitoring purposes
        update_function(index, len(all_pipelines))

        # SVM without scaling can loop consuming infinite CPU time so
        # we prevent that combination here.
        if (estimator == 'svm' and scaler == 'none'):
            continue

        key = '__'.join([scaler, feature_selector, estimator, searcher])
        roc_curves = {}
        print('Generating ' + model_key_to_name(key))

        # Generate the pipeline
        pipeline = generate_pipeline(
            scaler,
            feature_selector,
            estimator,
            y_train,
            scorers,
            searcher,
            shuffle,
            custom_hyper_parameters
        )

        if not estimator in total_fits:
            total_fits[estimator] = 0
        total_fits[estimator] += pipeline[1]

        # Fit the pipeline
        with parallel_backend('multiprocessing'):
            model = generate_model(pipeline[0], feature_names, x_train, y_train)

        if pipeline[2]:
            roc_curves = pipeline[2].get_mean()

        for scorer in scorers:
            key += '__' + scorer
            model.update(
                refit_model(pipeline[0], model['features'], estimator, scorer, x_train, y_train))

            total_fits[estimator] += 1

            result = {
                'key': key,
                'scaler': SCALER_NAMES[scaler],
                'feature_selector': FEATURE_SELECTOR_NAMES[feature_selector],
                'estimator': ESTIMATOR_NAMES[estimator],
                'searcher': SEARCHER_NAMES[searcher],
                'scorer': SCORER_NAMES[scorer]
            }

            result.update(generalize(model, pipeline[0], x2, y2, labels))
            result.update({
                'selected_features': list(model['selected_features']),
                'best_params': model['best_params']
            })
            result.update(roc_curves)
            result.update(roc(pipeline[0], model, x_test, y_test, 'test'))
            result.update(roc(pipeline[0], model, x2, y2, 'generalization'))
            result.update(reliability(pipeline[0], model, x2, y2))

            if not results:
                report_writer.writerow(result.keys())

            report_writer.writerow(list([str(i) for i in result.values()]))
            results.append(result)

    report.close()
    print('Total fits generated', sum(total_fits.values()))
    print_summary(results)

    # Update the metadata and write it out
    metadata.update({
        'date': time.time(),
        'fits': total_fits
    })

    if output_path != '.':
        with open(output_path + '/metadata.json', 'a+') as metafile:
            metafile.seek(0)

            # Load the existing metadata
            existing_metadata = json.load(metafile)

            # Empty the file
            metafile.seek(0)
            metafile.truncate()

            existing_metadata.update(metadata)
            json.dump(existing_metadata, metafile)

    return results
