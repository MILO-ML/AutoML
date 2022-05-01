"""
Process a dataset based on a pipeline
"""

import numpy as np

def preprocess(features, pipeline, data):
    """Process the test data based on the pipeline used to
    generate the model"""

    # If scaling is used in the pipeline, scale the test data
    if 'scaler' in pipeline.named_steps:
        data = pipeline.named_steps['scaler'].transform(data)

    if 'feature_selector' in pipeline.named_steps:
        feature_selector_type = pipeline.named_steps['feature_selector'].__class__.__module__

        if 'univariate_selection' in feature_selector_type or\
          'processors.rffi' in feature_selector_type:

            # Identify the selected featured for model provided
            for index, feature in reversed(list(enumerate(features.items()))):

                # Remove the feature if unused from the data
                if not feature[1]:
                    data = np.delete(data, index, axis=1)

        if 'sklearn.decomposition.pca' in feature_selector_type:
            data = pipeline.named_steps['feature_selector'].transform(data)

    return data
