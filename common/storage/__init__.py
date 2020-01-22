"""
Storage abstraction
"""

import os

from libcloud.storage.types import Provider
from libcloud.storage.providers import get_driver

AZURE_STORAGE_KEY = os.getenv('AZURE_STORAGE_KEY')

def storage_factory():
    client = get_driver(Provider.LOCAL)
    local = client('data')
    return local

    if AZURE_STORAGE_KEY is not None:
        client = get_driver(Provider.AZURE_BLOBS)
        azure = client(key='miloml', secret=AZURE_STORAGE_KEY)
        return azure
    else:
        client = get_driver(Provider.LOCAL)
        local = client('data')
        return local
