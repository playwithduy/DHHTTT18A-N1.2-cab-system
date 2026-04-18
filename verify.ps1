$envArgs = node tests/seed.js
Invoke-Expression "npx newman run tests/Level10_ZeroTrust.postman_collection.json $envArgs"
