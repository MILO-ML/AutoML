"""
Auto ML

Supervised learning using an exhaustive search of ideal pre-processing (if any), algorithms,
and hyper-parameters with feature engineering.
"""

import csv
import json
import time
import itertools

from dotenv import load_dotenv

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
        parameters=None,
        output_path='.',
        update_function=lambda x, y: None
    ):
    """Generates all possible models and outputs the generalization results"""

    ignore_estimator = [x.strip() for x in parameters.get('ignore_estimator', '').split(',')]
    ignore_feature_selector = \
        [x.strip() for x in parameters.get('ignore_feature_selector', '').split(',')]
    ignore_scaler = [x.strip() for x in parameters.get('ignore_scaler', '').split(',')]
    ignore_searcher = [x.strip() for x in parameters.get('ignore_searcher', '').split(',')]
    shuffle = False if parameters.get('ignore_shuffle', '') != '' else True
    scorers = [x for x in SCORER_NAMES if x not in \
        [x.strip() for x in parameters.get('ignore_scorer', '').split(',')]]

    if train_set is None:
        print('Missing training data')
        return {}

    if test_set is None:
        print('Missing test data')
        return {}

    if label_column is None:
        print('Missing column name for classifier target')
        return {}

    custom_hyper_parameters = json.loads(parameters['hyper_parameters'])\
        if 'hyper_parameters' in parameters else None

    # Import data
    (x_train, x_test, y_train, y_test, x2, y2, feature_names, metadata) = \
        import_data(train_set, test_set, label_column)

    total_fits = {}
    csv_header_written = False

    all_pipelines = list(itertools.product(*[
        filter(lambda x: False if x in ignore_estimator else True, ESTIMATOR_NAMES),
        filter(lambda x: False if x in ignore_scaler else True, SCALER_NAMES),
        filter(lambda x: False if x in ignore_feature_selector else True, FEATURE_SELECTOR_NAMES),
        filter(lambda x: False if x in ignore_searcher else True, SEARCHER_NAMES),
    ]))

    if not len(all_pipelines):
        print('No pipelines to run with the current configuration')
        return False

    report = open(output_path + '/report.csv', 'w+')
    report_writer = csv.writer(report)

    for index, (estimator, scaler, feature_selector, searcher) in enumerate(all_pipelines):

        # Trigger a callback for task monitoring purposes
        update_function(index, len(all_pipelines))

        key = '__'.join([scaler, feature_selector, estimator, searcher])
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
        model = generate_model(pipeline[0], feature_names, x_train, y_train)

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
            result.update(roc(pipeline[0], model, x_test, y_test, 'test'))
            result.update(roc(pipeline[0], model, x2, y2, 'generalization'))
            result.update(reliability(pipeline[0], model, x2, y2))

            if not csv_header_written:
                report_writer.writerow(result.keys())
                csv_header_written = True

            report_writer.writerow(list([str(i) for i in result.values()]))

    report.close()
    print('Total fits generated', sum(total_fits.values()))
    print_summary(output_path + '/report.csv')

    # Update the metadata and write it out
    metadata.update({
        'date': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
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

    return True
