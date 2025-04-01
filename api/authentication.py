"""
Methods to handle authentication.

This module provides LDAP authentication with support for both:
- Direct binding with user credentials
- Service account binding before user authentication (secure LDAP configurations)
"""

import json
import os
from datetime import datetime, timedelta, timezone

import jwt
from ldap3 import Server, Connection, SUBTREE, SIMPLE
from flask import jsonify, request, abort

def ldap_login():
    """
    Authenticate a user using LDAP.
    
    Supports two authentication methods:
    1. Direct bind: Attempts to bind directly using the provided user credentials
    2. Service account bind: First binds with service account, then authenticates the user
       (controlled by LDAP_USE_SERVICE_ACCOUNT environment variable)
    
    Required environment variables:
    - LDAP_SERVER: LDAP server address
    - LDAP_BASE_DN: Base DN for LDAP searches
    - LDAP_AUTH_SECRET: Secret key for JWT token signing
    
    Optional environment variables:
    - LDAP_REQUIRED_GROUP: Group membership required for authentication
    - LDAP_USE_SERVICE_ACCOUNT: Set to "true" to use service account binding
    - LDAP_SERVICE_ACCOUNT_DN: Service account distinguished name (when using service account)
    - LDAP_SERVICE_ACCOUNT_PASSWORD: Service account password (when using service account)
    """

    payload = json.loads(request.data)
    username = payload['username']
    password = payload['password']
    
    # Determine username for search (remove domain if present)
    search_username = username.split('@')[0]
    
    # Set up the LDAP server connection
    server = Server(os.getenv('LDAP_SERVER'))
    
    # Check if we need to use service account binding first
    use_service_account = os.getenv('LDAP_USE_SERVICE_ACCOUNT', '').lower() == 'true'
    
    if use_service_account:
        # Bind with service account first
        service_account_dn = os.getenv('LDAP_SERVICE_ACCOUNT_DN')
        service_account_password = os.getenv('LDAP_SERVICE_ACCOUNT_PASSWORD')
        
        if not service_account_dn or not service_account_password:
            # Missing service account configuration
            return abort(500)
        
        # Bind with service account
        connection = Connection(
            server,
            user=service_account_dn,
            password=service_account_password,
            authentication=SIMPLE
        )
        
        if not connection.bind():
            # Service account bind failed
            return abort(500)
            
        # Search for the user
        connection.search(
            search_base=os.getenv('LDAP_BASE_DN'),
            search_filter=f'(sAMAccountName={search_username})',
            search_scope=SUBTREE,
            attributes=['objectGUID', 'givenName', 'sn', 'mail', 'memberOf', 'distinguishedName']
        )
        
        if not connection.entries:
            # User not found
            connection.unbind()
            return abort(401)
        
        # Get the user's DN
        user_dn = str(connection.entries[0]['distinguishedName'])
        
        # Unbind service account connection
        connection.unbind()
        
        # Try to bind with the user's credentials
        connection = Connection(
            server,
            user=user_dn,
            password=password,
            authentication=SIMPLE
        )
        
        if not connection.bind():
            # User authentication failed
            return abort(401)
            
        # Re-search to get all user attributes
        connection.search(
            search_base=os.getenv('LDAP_BASE_DN'),
            search_filter=f'(distinguishedName={user_dn})',
            search_scope=SUBTREE,
            attributes=['objectGUID', 'givenName', 'sn', 'mail', 'memberOf']
        )
    else:
        # Original direct bind method
        connection = Connection(
          server,
          user=username,
          password=password
        )

        if not connection.bind():
            return abort(401)
        else:
            connection.search(
              search_base=os.getenv('LDAP_BASE_DN'),
              search_filter=f'(sAMAccountName={search_username})',
              search_scope=SUBTREE,
              attributes=['objectGUID', 'givenName', 'sn', 'mail', 'memberOf']
            )

    # Group membership verification
    if os.getenv('LDAP_REQUIRED_GROUP') and not any(os.getenv('LDAP_REQUIRED_GROUP') in item for item in connection.entries[0]['memberOf']):
        connection.unbind()
        return abort(401)

    token = jwt.encode(
      {
        'iss': 'milo-ml',
        'aud': 'milo-ml',
        'sub': username,
        'iat': datetime.utcnow(),
        'exp': datetime.now(tz=timezone.utc) + timedelta(days=1),
        'uid': str(connection.entries[0]['objectGUID']).strip('{}'),
        'name': str(connection.entries[0]['givenName']) + ' ' + str(connection.entries[0]['sn']),
        'email': str(connection.entries[0]['mail'])
      },
      os.getenv('LDAP_AUTH_SECRET'),
      algorithm='HS256'
    )

    connection.unbind()
    return jsonify({'token': token})

def ldap_verify(token):
    """
    Verifies a JWT token provided after an LDAP authentication.
    """

    return jwt.decode(token, os.getenv('LDAP_AUTH_SECRET'), issuer='milo-ml', audience='milo-ml', algorithms=['HS256'])
