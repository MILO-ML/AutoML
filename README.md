# AutoML

Supervised and unsupervised learning using an exhaustive search of ideal
pre-processing (if any), algorithms, and hyper-parameters with feature engineering.

This program is currently tuned towards binary classification such as those seen
in medicine (eg. disease or no disease).

## Environment Setup

Below are the steps to setup a new environment for running MILO on a
Debian based machine. The below steps are based on a fresh Debian 10.1
install. If you already have a working Python environment, you can
skip this section.

```sh
# Install dependencies
apt install build-essential nodejs libpython3.7-dev python-virtualenv rabbitmq-server

# Setup virtual environment
virtualenv -p python3 milo-env

# Change to this environment
source milo-env/bin/activate

# Always source this environment (optional)
printf "\nsource /home/<username>/milo-env/bin/activate" >> .bashrc

# Generate a secret for web sockets
echo -e "\nSOCKET_SECRET_KEY=$(cat /dev/urandom | env LC_CTYPE=C tr -cd 'a-f0-9' | head -c 10)"
```

## Install

Perform the following steps to install the application:

```sh
git clone git@ssh.dev.azure.com:v3/albahra/AutoML/AutoML
cd AutoML
npm install

# For future updates, simply run:
npm run update
```

## Data / Input

Currently data is expected to be in CSV format in two files:

`train.csv`: The complete training set which will be split into a train and test set.
This data set should be balanced 50/50. If the data set is not balanced a warning
will be shown (when run in via the CLI).

`test.csv`: A secondary data set which will be used independent of model generation
and will be used to determine the generalizability of the model. This data set
reflects the prevalence of disease being classified (eg. not balanced).

## Command Line Interface

To run the program simply execute the following command:

```sh
# Replace TARGET with the name of the column you are targeting
python cli.py train.csv test.csv TARGET | tee report.txt
```

This will execute the program and send the output to both the terminal and
the file `report.txt`. It will also output `report.csv` which contains the summary
of all models generated.

If you do not pass a train and test spreadsheet, sample data contained within
`sample-data` will be used.

## Web Service

Running the application as a service with an HTTP API and Angular SPA front end
can be done by using the following command:

```sh
npm run serve
```

## Unit Testing

```sh
# Run all unit tests
npm test
```
