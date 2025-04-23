# Docker

MILO-ML's docker image hosts everything needed to get up and running with MILO-ML.

## Install Docker Desktop

Download [Docker Desktop](https://www.docker.com/products/docker-desktop) and follow the instructions from the installer to get it installed on your system.

::: warning
Windows users may need to install WSL 2 and will be instructed by the Docker installation, if required.
:::

Before proceeding to the next step, please ensure Docker is running. This can be confirmed from the Docker Dashboard window which shows a green bar on the bottom left corner:

![Docker Images](./images/docker-images.png)

The status can also be shown in the system tray:

![Docker Dashboard Link](./images/docker-dashboard-link.png)

## Download the MILO-ML Image

In this section, we will use Docker command line interface to pull the MILO-ML docker image.

Please open any terminal and run the following command:

:::tip
For Windows users, you can search for `Command Prompt` in the search menu.

For macOS users, you can search Spotlight for `Terminal`.
:::

```sh
docker pull miloteam/aio
```

## First Time Starting MILO-ML

Once the MILO-ML image is loaded, the remainder of the deployment can be performed within Docker Desktop.

To start this image first open the Docker Desktop Dashboard and navigate to the `Images` section:

![Docker Images](./images/docker-images.png)

You will see an image name prefixed with `miloteam/` and will end with the version of MILO loaded (e.g., education, pro, or trial). If you hover over this two buttons will appear one of which is labeled `Run` as shown here:

![Docker Run Image](./images/docker-image-run.png)

After clicking this button you will be presented with a modal with some optional settings. Please expand this section
and configure it as shown in the image below:

![Docker Run Settings](./images/docker-run-settings.png)

The port 5000 is HTTP application port and is being forwarded to the host machine's port 5000 in the above image. The data
directory is where MILO-ML places input data and results and can be mapped to the local machine for consistency between runs.

::: warning
License keys are associated to the hardware and therefore will become invalidated as the hardware changes. Keep in mind, each time
the `Run` button is clicked Docker creates new virtual hardware.
:::

::: warning
macOS added an Airplay Receiver service which listens on port 5000 and must either be disabled or we suggest using another port (e.g., 5001).
:::

Additional configuration options are available under the [Advanced Configuration](#advanced-configuration)

## Start Using MILO-ML

After you start MILO-ML, you should see some output similar to the following:

![Docker Running](./images/docker-running.png)

This informs you that MILO-ML is ready to start processing requests and you can now launch your browser and navigating
to the following URL: <http://127.0.0.1:5000>.

## Stopping MILO-ML

You can always stop and re-start MILO-ML using the Dashboard by clicking the `Stop` button as shown below:

![Docker Stop](./images/docker-stop.png)

::: warning
Stopping MILO-ML will interrupt any training currently in progress so ensure no tasks are pending before stopping.
:::

Once stopped, the button will change to a play button allowing you to start MILO-ML again.

## Advanced Configuration

In addition to the host port, several other options can be configured.

MILO will store data within the Docker container however
users may wish to store the data (uploaded datasets, run data, published models, etc.) outside of the container
and may do so by mounting a volume. This is important when updating MILO in order preserve the data between versions.
The `Host Path` refers to the location on the machine running Docker and the `Container Path`
will always be: `/milo/data`. Additionally, SSL certificates are stored within `/milo/ssl` and can be mounted to replace the default
self-signed certificate.

::: warning
Generally speaking, the below values should not be used unless directed.
:::

In addition, MILO will typically run in a single user mode meaning no authentication is done as the interface is only expected to
be accessed via the localhost adapter. If you intend to run MILO to multiple users, you will want to disable the single user configuration
by defining an environment variable `LOCAL_USER` and setting the value to `false`.

If MILO is to deployed in an enterprise environment, authentication can be configured using LDAP. The following environment variables are
available for configuration in such an environment:

`LDAP_AUTH`: Either `true` or `false` (default)

`LDAP_SERVER`: The complete path to the LDAP server including the protocol (`ldap` or `ldaps`) and port number.

`LDAP_BASE_DN`: Defines the base distinguished name used to search for users.

`LDAP_AUTH_SECRET`: After successfully authenticating using LDAP, sessions are authenticated using a signed JWT token and this defines
the secret for that token.

`LDAP_REQUIRED_GROUP`: Ensure the user is a member of the group provided. Only checked if a group is defined otherwise no group checking is performed.

`LDAP_LOGIN_ATTRIBUTE`: The LDAP attribute to use for user lookup (default `sAMAccountName`).

`LDAP_SEARCH_SCOPE`: The LDAP search scope – one of `BASE`, `LEVEL`, or `SUBTREE` (default `SUBTREE`).

`LDAP_SEARCH_FILTER`: A custom LDAP search filter; if set, it overrides the default attribute filter and group check.

### LDAP Service Account Binding

MILO-ML supports LDAP servers that require authenticated connections for directory searches (no anonymous binds). In this configuration, 
MILO-ML first binds with a service account, then searches for the user, and finally authenticates with the user's credentials.

To enable service account binding, set the following environment variables:

`LDAP_USE_SERVICE_ACCOUNT`: Set to `true` to enable service account binding (default is `false`)

`LDAP_SERVICE_ACCOUNT_DN`: The distinguished name (DN) of the service account used for initial binding

`LDAP_SERVICE_ACCOUNT_PASSWORD`: The password for the service account

::: tip
Service account binding is recommended for secure LDAP configurations where the directory server requires authenticated connections
for searching the directory.
:::

`BROKER_URL`: URL to the RabbitMQ broker (do not use when using the all-in-one image).

### Configuring Docker Resources

This is a one time step after installing Docker to ensure enough resources are allocated for MILO-ML. This is done using the Docker Desktop Dashboard launched as shown here:

![Docker Dashboard Link](./images/docker-dashboard-link.png)

Inside the dashboard click the button with a gear icon as shown:

![Docker Settings Button](./images/docker-settings-button.png)

This will navigate to a settings page which has sections on the left hand side. Please navigate to the `Resources` section as shown below:

![Docker Resources](./images/docker-resources.png)

Here, please adjust the settings to maximize the available CPU and memory to meet at least 4 CPUs and at least 8GB of RAM.
