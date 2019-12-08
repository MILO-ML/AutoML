export class Results {
    metadata: MetaData;
    results: GeneralizationResult[];
}

export class MetaData {
    fits: {
        knn: number;
        nb: number;
        svm: number;
        rf: number;
        mlp: number;
        lr: number;
        gb: number;
    };
    train_negative_count: number;
    train_positive_count: number;
    test_negative_count: number;
    test_positive_count: number;
}

export class GeneralizationResult {
    key: string;
    scaler: string;
    feature_selector: string;
    estimator: string;
    searcher: string;
    scorer: string;
    accuracy: number;
    auc: number;
    f1: number;
    sensitivity: number;
    specificity: number;
    tn: number;
    tp: number;
    fn: number;
    fp: number;
    selected_features: string;
    best_params: string;
    std_auc: string;
    mean_fpr: string;
    mean_tpr: string;
    mean_upper: string;
    mean_lower: string;
    test_fpr: string;
    test_tpr: string;
    generalization_fpr: string;
    generalization_tpr: string;
    brier_score: string;
    fop: string;
    mpv: string;
}

export class TaskAdded {
    id: number;
    href: string;
}

export class ActiveTaskStatus {
    state: 'PENDING' | 'RECEIVED' | 'STARTED' | 'REVOKED' | 'RETRY' | 'FAILURE' | 'SUCCESS';
    current: number;
    total: number;
    status: string;
}

export class ScheduledTaskStatus {
    state: 'PENDING';
    eta: string;
}

export class PendingTasks {
    active: ActiveTaskStatus[];
    scheduled: ScheduledTaskStatus[];
}
