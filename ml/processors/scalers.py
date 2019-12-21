"""
All scalers used
"""

from sklearn.preprocessing import MinMaxScaler, StandardScaler

SCALERS = {
    'none': '',
    'minmax': MinMaxScaler(),
    'std': StandardScaler()
}

SCALER_NAMES = {
    'none': 'no scaling',
    'minmax': 'min max scaler',
    'std': 'standard scaler'
}
