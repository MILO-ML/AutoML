"""
Predicts outcome from incoming data against exported model
"""

from joblib import load

def predict(data, path='.'):
    """Predicts against the provided data"""

    # Load the pipeline
    pipeline = load(path + '.joblib')

    predicted = pipeline.predict(data).tolist()
    probability = pipeline.predict_proba(data).tolist()

    return {
        'predicted': predicted,
        'probability': [sublist[predicted[index]] for index, sublist in enumerate(probability)]
    }
