# set base image (host OS)
FROM python:3.7

# expose ports
EXPOSE 5000

# install OS dependencies
RUN apt-get update
RUN apt-get -y install curl gnupg sudo
RUN curl -sL https://deb.nodesource.com/setup_14.x | bash -
RUN apt-get -y install nodejs rabbitmq-server

# create user
RUN useradd -r -m -g sudo milo
RUN echo '%sudo ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers
USER milo

# update path for Python
ENV PATH="/home/milo/.local/bin:${PATH}"

# set the working directory in the container
WORKDIR /milo

# create data directory
RUN mkdir data

# copy the Python dependencies to the working directory
COPY --chown=milo requirements.txt .

# install Python requirements
RUN pip install -r requirements.txt

# copy the dependencies file to the working directory
COPY --chown=milo package.json .
COPY --chown=milo package-lock.json .

# install app dependencies
RUN npm install --ignore-scripts

# copy remaining Python code
COPY --chown=milo server.py .
COPY --chown=milo worker.py .
COPY --chown=milo ml/ ml/
COPY --chown=milo common/ common/
COPY --chown=milo api/ api/

# copy static assets (UI and documentation)
COPY --chown=milo static/ static/

# start the application
CMD [ "npm", "run", "run-docker" ]