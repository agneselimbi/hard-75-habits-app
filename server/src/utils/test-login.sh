#!/bin/bash

echo "Testing login..."

# Make login request and store full response
RESPONSE=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json " \
  -d '{"email":"alice@hard75.com","password":"test1234"}')

echo "Response: $RESPONSE"

# Extract token using Node.js
TOKEN=$(echo $RESPONSE | node -pe "
  try {
    const data = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
    data.token || 'NO_TOKEN';
  } catch(e) {
    'ERROR';
  }
")

if [ "$TOKEN" = "NO_TOKEN" ] || [ "$TOKEN" = "ERROR" ]; then
  echo "Failed to extract token. Login may have failed."
  exit 1
fi

echo "Token extracted:$TOKEN"

# Test the token on a protected route
echo "Testing protected route..."
curl -X GET http://localhost:3000/users/profile \
  -H "Authorization: Bearer $TOKEN"