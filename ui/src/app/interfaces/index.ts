export interface Results {
    metadata: MetaData;
    results: GeneralizationResult[];
}

export interface PriorJobs {
    metadata: MetaData;
    id: string;
    label: string;
    results: boolean;
}

export interface MetaData {
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
    parameters: SearchParameters;
    date: number;
}

export interface GeneralizationResult {
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

export interface SearchParameters {
    ignore_estimator: string;
    ignore_feature_selector: string;
    ignore_scaler: string;
    ignore_scorer: string;
    ignore_searcher: string;
    ignore_shuffle: boolean;
    hyper_parameters: string;
}

export interface TaskAdded {
    id: number;
    href: string;
}

export interface ActiveTaskStatus {
    current: number;
    total: number;
    status: string;
    time: number;
    id: string;
    state: 'PENDING' | 'RECEIVED' | 'STARTED' | 'REVOKED' | 'RETRY' | 'FAILURE' | 'SUCCESS';
    jobid: string;
    label: string;
    parameters: SearchParameters;
}
export interface ScheduledTaskStatus {
    eta: string;
    state: 'PENDING';
    jobid: string;
    label: string;
    parameters: SearchParameters;
}
export interface PendingTasks {
    active: ActiveTaskStatus[];
    scheduled: ScheduledTaskStatus[];
}
export interface PublishedModels {
    [key: string]: string[];
}
