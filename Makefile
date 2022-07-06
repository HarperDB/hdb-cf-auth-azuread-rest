default: dev

dev: down
	docker run \
		-v $(shell pwd)/src:/opt/harperdb/hdb \
		-v $(shell pwd)/routes:/opt/harperdb/hdb/custom_functions/ad-auth/routes \
		-v $(shell pwd)/helpers:/opt/harperdb/hdb/custom_functions/ad-auth/helpers \
		-v $(shell pwd)/node_modules:/opt/harperdb/hdb/custom_functions/ad-auth/node_modules \
		-v $(shell pwd)/package.json:/opt/harperdb/hdb/custom_functions/ad-auth/package.json \
		--env-file .env \
		-e LOG_TO_STDSTREAMS=true \
		-e RUN_IN_FOREGROUND=true \
		-e CUSTOM_FUNCTIONS=true \
		-e SERVER_PORT=9925 \
		-e CUSTOM_FUNCTIONS_PORT=9926 \
		-e MAX_CUSTOM_FUNCTION_PROCESSES=1 \
		-p 9925:9925 \
		-p 9926:9926 \
		harperdb/harperdb:latest

first:
	docker run \
		-v $(shell pwd)/src:/opt/harperdb/hdb \
		--env-file .env \
		-e LOG_TO_STDSTREAMS=true \
		-e RUN_IN_FOREGROUND=true \
		-e CUSTOM_FUNCTIONS=true \
		-e SERVER_PORT=9925 \
		-e CUSTOM_FUNCTIONS_PORT=9926 \
		-e MAX_CUSTOM_FUNCTION_PROCESSES=1 \
		-p 9925:9925 \
		-p 9926:9926 \
		harperdb/harperdb:latest

bash:
	docker run \
		-it \
		-v $(shell pwd)/src:/opt/harperdb/hdb \
		-v $(shell pwd)/routes:/opt/harperdb/hdb/custom_functions/ad-auth/routes \
		-v $(shell pwd)/helpers:/opt/harperdb/hdb/custom_functions/ad-auth/helpers \
		-v $(shell pwd)/node_modules:/opt/harperdb/hdb/custom_functions/ad-auth/node_modules \
		-v $(shell pwd)/package.json:/opt/harperdb/hdb/custom_functions/ad-auth/package.json \
		harperdb/harperdb:latest \
		bash

down:
	docker stop $(shell docker ps -q --filter ancestor=harperdb/harperdb ) || exit 0
