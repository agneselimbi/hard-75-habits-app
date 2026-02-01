echo "Testing resistration..."

# Make registration request and store full response
RESPONSE=$(curl -s -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json " \
  -d '{"email":"george@hard75.com","password":"test1234","name":"George"}')

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
  echo "Failed to extract token. Registration may have failed."
  exit 1
fi
echo "Token extracted: $TOKEN"  

# Extract passsword using Node.js
PASSWORD=$(echo $RESPONSE | node -pe "
  try {
    const data = JSON.parse(require('fs').readFileSync(0, 'utf-8'));        
    data.password || 'NO_PASSWORD';
  } catch(e) {
    'ERROR';
  }
")  

if [ "$PASSWORD" = "NO_PASSWORD" ] || [ "$PASSWORD" = "ERROR" ]; then
  echo "Failed to extract password. Registration may have failed."
  exit 1
fi
echo "Password extracted: $PASSWORD"