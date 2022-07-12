# HarperDB Azure Active Directory REST API
This project adds Active Directory authentication to the HaperDB REST API Custom Function.

The dynamic REST API is an interface for the HarperDB database, granting you access to CRUD operations using standard GET, POST, PUT, DELETE, and PATCH requests.

## Login - Get a Token
All REST API operations require a token for authentication.

### Username/Password Auth
To get a token with your Active Directory Username and Password, create a POST request to `$CF_HOST/ad-auth/login`.

```
curl -X POST $CF_HOST:9926/ad-auth/login \
   -H 'Content-Type: application/json' \
   -d '{"username":"doggo@harperdb.io","password":"D0GSRUL3!"}'
```

### Microsoft Login Dialog
To get a token via the Microsoft Login Dialog, visit `$CF_HOST/ad-auth/login` in a web browser.

### Using the Token
Record the token that's returned in either of the above requests to use in all REST API requests by adding it to the URL query (ex. /ad-auth/dev/dogs/1?token=lknan3th08ihn4)

## Create Data
```
curl -X POST $CF_HOST/ad-auth/dev/dog \
   -H "Authorization: $TOKEN" \
   -H 'Content-Type: application/json' \
   -d '{"id": 1, "name":"woofie","tail":"wag"}'
```

## Read Data
### By ID
```
curl -X GET $CF_HOST/ad-auth/dev/dog/5 -H "Authorization: $TOKEN"
```

### All
```
curl -X GET $CF_HOST/ad-auth/dev/dog -H "Authorization: $TOKEN"
```

## Update Data
### Change All Provided Object Properties
```
curl -X PATCH $CF_HOST/ad-auth/dev/dog/1 -H "Authorization: $TOKEN"
```
### Replace Object with Provided Object
```
curl -X PUT $CF_HOST/ad-auth/dev/dog/1 -H "Authorization: $TOKEN"
```

## Delete Data
### Change All Provided Object Properties
```
curl -X DELETE $CF_HOST/ad-auth/dev/dog/1 -H "Authorization: $TOKEN"
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

## AAD Config
As an alternative to using environment variables, the file `$HOME/.aad_config.json` can be created with the credentails. For example,
```
{
  "clientId": "ADD_CLIENT_ID_HERE",
  "authority": "ADD_AUTH_URL_HERE",
  "clientSecret": "ADD_CLIENT_SECRET_HERE",
  "redirectUri": "ADD_REDIRECT_URI_HERE"
}
```

## Development
This repository contains a `Makefile` with targets to start a HarperDB docker container and attach to the Custom Functions directory.

### On First Run
Run `make first` to launch the initial container. This creates the `/src` directory and populates it with the HarperDB configuration. Once that's running (takes about a minute), stop it with `make down`.

### On Every Other Run (Active Development)
To run the HarperDB container and attach the Custom Function code, run `make`. This will mount the volumes and enable port forwarding so the application will be available at `http://localhost:9926/ad-auth`.
