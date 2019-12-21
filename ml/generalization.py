"""
Generalization of a provided model using a secondary test set.
"""

from sklearn.metrics import roc_auc_score, accuracy_score,\
    confusion_matrix, classification_report, f1_score

from .preprocess import preprocess

def generalize(model, pipeline, x2, y2, labels=None):
    """"Generalize method"""

    # Process test data based on pipeline
    x2 = preprocess(model['features'], pipeline, x2)
    predictions = model['best_estimator'].predict(x2)
    print('\t', classification_report(y2, predictions, target_names=labels).replace('\n', '\n\t'))

    print('\tGeneralization:')

    accuracy = accuracy_score(y2, predictions)
    print('\t\tAccuracy:', accuracy)

    auc = roc_auc_score(y2, predictions)
    print('\t\tBinary AUC:', auc)

    roc_auc = roc_auc_score(y2, model['best_estimator'].predict_proba(x2)[:, 1])
    print('\t\tROC AUC:', roc_auc)

    tn, fp, fn, tp = confusion_matrix(y2, predictions).ravel()
    f1 = f1_score(y2, predictions, average='macro')
    sensitivity = tp / (tp+fn)
    specificity = tn / (tn+fp)
    print('\t\tSensitivity:', sensitivity)
    print('\t\tSpecificity:', specificity)
    print('\t\tF1:', f1, '\n')

    return {
        'accuracy': accuracy,
        'auc': auc,
        'roc_auc': roc_auc,
        'f1': f1,
        'sensitivity': sensitivity,
        'specificity': specificity,
        'tn': tn,
        'tp': tp,
        'fn': fn,
        'fp': fp
    }
