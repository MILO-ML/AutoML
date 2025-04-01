# AutoML

Supervised and unsupervised learning utilizing feature engineering and using an exhaustive search of ideal
pre-processing (if any), algorithms, and hyper-parameters.

This program is currently tuned towards binary classification such as those seen
in medicine (eg. disease or no disease).

## Environment Setup

Below are the steps to setup a new environment for running MILO-ML on a
Debian based machine. The below steps are based on a fresh Debian 10.1
install. If you already have a working Python environment, you can
skip this section.

### Linux (Debian)

```sh
# Install dependencies
apt install build-essential nodejs libpython3.7-dev python-virtualenv rabbitmq-server libomp-dev

# Setup virtual environment
virtualenv -p python3 milo-env

# Change to this environment
source milo-env/bin/activate

# Always source this environment (optional)
printf "\nsource /home/<username>/milo-env/bin/activate" >> .bashrc
```

### MacOSX

```sh
# Install brew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install.sh)"

# Install dependencies
brew install rabbitmq gcc freetype node
pip3 install virtualenv

# Setup virtual environment
virtualenv -p python3 milo-env

# Change to this environment
source milo-env/bin/activate

# Always source this environment (optional)
printf "\nsource /home/<username>/milo-env/bin/activate" >> .bash_profile
```

## Install

Perform the following steps to install the application:

```sh
git clone git@ssh.dev.azure.com:v3/milo-ml/MILO-ML/AutoML
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

## Authentication

This application supports authentication via LDAP with two different binding methods:

### Direct Binding (Default)

The application attempts to bind directly with the user's credentials. This is the simplest
configuration but may not work with LDAP servers that require authenticated connections
for searching the directory.

Required environment variables:
- `LDAP_SERVER`: LDAP server address
- `LDAP_BASE_DN`: Base DN for LDAP searches
- `LDAP_AUTH_SECRET`: Secret key for JWT token signing

Optional:
- `LDAP_REQUIRED_GROUP`: Group membership required for authentication

### Service Account Binding

The application first binds with a service account before authenticating the user. This is
required for LDAP servers that do not allow anonymous queries or require all connections
to be authenticated.

Enable this mode by setting the following additional environment variables:
- `LDAP_USE_SERVICE_ACCOUNT`: Set to "true" to use service account binding
- `LDAP_SERVICE_ACCOUNT_DN`: Service account distinguished name
- `LDAP_SERVICE_ACCOUNT_PASSWORD`: Service account password

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

## Documentation

VuePress is used to generate the documentation which can be run as follows:

```sh
cd docs
npm run dev
```

## Git Submodules

This repository uses a git submodule.

If you cloned the repository without using `--recursive`, then you can initialize and clone the submodule with the following steps.

1. Init the submodule

    ```bash
    git submodule init
    ```

2. Update the submodule

    ```bash
    git submodule update --remote
    ```

For more advanced usage, please refer to the git documentation: [https://git-scm.com/book/en/v2/Git-Tools-Submodules](https://git-scm.com/book/en/v2/Git-Tools-Submodules)
