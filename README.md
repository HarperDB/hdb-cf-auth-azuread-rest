# HarperDB Azure Active Directory REST API
This project adds Active Directory authentication to the HaperDB REST API Custom Function.

The dynamic REST API is an interface for the HarperDB database, granting you access to CRUD operations using standard GET, POST, PUT, DELETE, and PATCH requests.

## Login - Get a Token
All REST API operations require a token for authentication.

### Username/Password Auth
To get a token with your Active Directory Username and Password, create a POST request to `$DOMAIN_NAME/ad-auth/login`.

```
curl -X POST $DOMAIN_NAME:9926/ad-auth/login \
   -H 'Content-Type: application/json' \
   -d '{"username":"doggo@harperdb.io","password":"D0GSRUL3!"}'
```

### Microsoft Login Dialog
To get a token via the Microsoft Login Dialog, visit `$DOMAIN_NAME:9926/ad-auth/login` in a web browser.

### Using the Token
Record the token that's returned in either of the above requests to use in all REST API requests by adding it to the URL query (ex. /ad-auth/dev/dogs/1?token=lknan3th08ihn4)

## Create Data
```
curl -X POST $DOMAIN_NANE:9926/ad-auth/dev/dog?token=16555c1bb8a3615ed383c8a9 \
   -H 'Content-Type: application/json' \
   -d '{"id": 1, "name":"woofie","tail":"wag"}'
```

## Read Data
### By ID
```
curl -X GET $DOMAIN_NANE:9926/ad-auth/dev/dog/1?token=16555c1bb8a3615ed383c8a9
```

### All
```
curl -X GET $DOMAIN_NANE:9926/ad-auth/dev/dog?token=16555c1bb8a3615ed383c8a9
```

## Update Data
### Change All Provided Object Properties
```
curl -X PATCH $DOMAIN_NANE:9926/ad-auth/dev/dog/1?token=16555c1bb8a3615ed383c8a9
```
### Replace Object with Provided Object
```
curl -X PUT $DOMAIN_NANE:9926/ad-auth/dev/dog/1?token=16555c1bb8a3615ed383c8a9
```

## Delete Data
### Change All Provided Object Properties
```
curl -X DELETE $DOMAIN_NANE:9926/ad-auth/dev/dog/1?token=16555c1bb8a3615ed383c8a9
```

## Deploying This Custom Function
This Custom Function can be deployed via the Studio (using the Deploy button on the Function page) or via the CLI with direct access to the instance by cloning this repository into the /custom_functions/ad-auth directory **and adding the required environment variables to the instance**.

## Environment Variables
The following environment variables are expected to be populated with the credentials from the Azure Active Directory application.

```
AAD_CLIENT_ID=
AAD_AUTH_URL=
AAD_CLIENT_SECRET=
AAD_REDIRECT_URI=
```

There is also a `.env.example` file that can be copied to `.env`, populated with the credentials and used for development.

## Development
This repository contains a `Makefile` with targets to start a HarperDB docker container and attach to the Custom Functions directory.

### On First Run
Run `make first` to launch the initial container. This creates the `/src` directory and populates it with the HarperDB configuration. Once that's running (takes about a minute), stop it with `make down`.

### On Every Other Run (Active Development)
To run the HarperDB container and attach the Custom Function code, run `make`. This will mount the volumes and enable port forwarding so the application will be available at `http://localhost:9926/ad-auth`.
