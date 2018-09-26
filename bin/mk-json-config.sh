#!/bin/bash
#
# Generates empty configuration files for each environment.
#

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
STAGES='dev test staging production'

TEMPLATE='
{\n
  "AWS_PROFILE": "",\n
  "AWS_REGION": "",\n
  "SYNAPSE_API_KEY": "",\n
  "SYNAPSE_USERNAME": "",\n
  "SYNAPSE_PASSWORD": ""\n
}
'

for STAGE in $STAGES
do
  echo -e $TEMPLATE > ${SCRIPT_DIR}/../.private.${STAGE}.json
done