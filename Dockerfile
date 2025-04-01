# set base image (host OS)
FROM python:3.9.13-slim as base

# install OS dependencies
RUN apt-get update
RUN apt-get -y install sudo rabbitmq-server build-essential libssl-dev

# create user
RUN useradd -r -m -g sudo milo
RUN echo '%sudo ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers
USER milo

# set the working directory in the container
RUN sudo mkdir /milo
RUN sudo chown -R milo /milo
WORKDIR /milo

# update path for Python
ENV PATH="/home/milo/.local/bin:${PATH}"

# create required directories
RUN mkdir data
RUN mkdir ssl

# generate SSL certificate
RUN openssl req -x509 -nodes \
    -subj  "/CN=localhost" \
    -addext "subjectAltName = DNS:localhost" \
    -addext "keyUsage = digitalSignature" \
    -addext "extendedKeyUsage = serverAuth" \
    -newkey rsa:2048 -keyout ssl/milo.key \
    -out ssl/milo.crt

# copy the Python dependencies to the working directory
COPY --chown=milo requirements.txt .

# install app dependencies
RUN pip install -r requirements.txt

# copy client assets
COPY --chown=milo client/ client/

# copy remaining Python code
COPY --chown=milo server.py .
COPY --chown=milo worker.py .
COPY --chown=milo ml/ ml/
COPY --chown=milo api/ api/
COPY --chown=milo uwsgi.ini .
COPY --chown=milo preprocessor/modules/ preprocessor/modules/

# copy static assets (UI and documentation)
COPY --chown=milo static/ static/

# copy the public license key
COPY --chown=milo public_key.pem .

# create a worker service image
FROM base as worker

# start the application
CMD celery -A worker worker -c 1

# create an api service image
FROM base as api

# expose ports
EXPOSE 5000
EXPOSE 8443

# env variables
ENV LOCAL_USER true
ENV LDAP_AUTH false
# LDAP service account binding configuration (disabled by default)
ENV LDAP_USE_SERVICE_ACCOUNT false
ENV LDAP_SERVICE_ACCOUNT_DN ""
ENV LDAP_SERVICE_ACCOUNT_PASSWORD ""

# start the application
CMD uwsgi --ini uwsgi.ini --processes $(grep -c 'cpu[0-9]' /proc/stat)

# create an all-in-one image used for a single instance
FROM api as aio

# start the application
CMD sudo rabbitmq-server & celery -A worker worker -c 1 & uwsgi --ini uwsgi.ini --processes 1
