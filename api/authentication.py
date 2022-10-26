"""
Methods to handle authentication.
"""

import os
from datetime import datetime, timedelta, timezone

import jwt
from ldap3 import Server, Connection, SUBTREE
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel


class LDAPAuthModel(BaseModel):
    """Class for incoming LDAP Auth Request"""

    username: str
    password: str


AUTH_ROUTER = APIRouter(prefix="/auth", tags=["Auth"])


@AUTH_ROUTER.post("ldap")
def ldap_login(payload: LDAPAuthModel):
    """
    Authenticate a user using LDAP.
    """

    connection = Connection(
        Server(os.getenv("LDAP_SERVER")),
        user=payload["username"],
        password=payload["password"],
    )

    if not connection.bind():
        raise HTTPException(status_code=401, detail="Unable to connect to LDAP server.")
    else:
        connection.search(
            search_base=os.getenv("LDAP_BASE_DN"),
            search_filter="(sAMAccountName=" + payload["username"].split("@")[0] + ")",
            search_scope=SUBTREE,
            attributes=["objectGUID", "givenName", "sn", "mail", "memberOf"],
        )

        if os.getenv("LDAP_REQUIRED_GROUP") and not any(
            os.getenv("LDAP_REQUIRED_GROUP") in item
            for item in connection.entries[0]["memberOf"]
        ):
            raise HTTPException(status_code=401, detail="Required group not found.")

        token = jwt.encode(
            {
                "iss": "milo-ml",
                "aud": "milo-ml",
                "sub": payload["username"],
                "iat": datetime.utcnow(),
                "exp": datetime.now(tz=timezone.utc) + timedelta(days=1),
                "uid": str(connection.entries[0]["objectGUID"]).strip("{}"),
                "name": str(connection.entries[0]["givenName"])
                + " "
                + str(connection.entries[0]["sn"]),
                "email": str(connection.entries[0]["mail"]),
            },
            os.getenv("LDAP_AUTH_SECRET"),
            algorithm="HS256",
        )

        connection.unbind()
        return {"token": token}


def ldap_verify(token):
    """
    Verifies a JWT token provided after an LDAP authentication.
    """

    return jwt.decode(
        token,
        os.getenv("LDAP_AUTH_SECRET"),
        issuer="milo-ml",
        audience="milo-ml",
        algorithms=["HS256"],
    )
