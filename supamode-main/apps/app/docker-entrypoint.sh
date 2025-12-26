#!/bin/sh

# Docker entrypoint script for nginx with environment variable substitution
set -e

echo "Starting Supamode Frontend..."
echo "API_URL: ${API_URL}"

# Validate API_URL is set
if [ -z "$API_URL" ]; then
    echo "ERROR: API_URL environment variable is not set"
    echo "Please set API_URL to your backend service URL (e.g., http://api:3000)"
    exit 1
fi

# Extract upstream server from API_URL for nginx upstream configuration
# Convert "http://api:3000" to "api:3000"
API_UPSTREAM=$(echo "$API_URL" | sed 's|^https\?://||')

# Handle special case: if API_URL contains localhost, replace with service name
if echo "$API_UPSTREAM" | grep -q "localhost"; then
    echo "⚠️  WARNING: API_URL contains localhost, replacing with 'api' service name"
    API_UPSTREAM="api:3000"
fi

export API_UPSTREAM

echo "API_UPSTREAM: ${API_UPSTREAM}"

# Test DNS resolution for the API service
API_HOST=$(echo "$API_UPSTREAM" | cut -d: -f1)
echo "Testing DNS resolution for API host: $API_HOST"

if command -v nslookup >/dev/null 2>&1; then
    if nslookup "$API_HOST" >/dev/null 2>&1; then
        echo "✅ DNS resolution for $API_HOST successful"
        # Show the resolved IP for debugging
        API_IP=$(nslookup "$API_HOST" | grep -A1 "Name:" | tail -1 | awk '{print $2}')
        echo "   Resolved to: $API_IP"
    else
        echo "❌ ERROR: DNS resolution for $API_HOST failed"
        echo "Available services in Docker network:"
        nslookup tasks.api 2>/dev/null || echo "No tasks.api found"
        exit 1
    fi
else
    echo "ℹ️ nslookup not available, skipping DNS test"
fi

# Substitute environment variables in nginx config template
echo "Processing nginx configuration template..."
envsubst '${API_URL} ${API_UPSTREAM}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Show the processed upstream configuration for debugging
echo "Generated upstream configuration:"
grep -A 5 -B 2 "server.*${API_UPSTREAM}" /etc/nginx/nginx.conf || echo "Upstream server line not found"

# Show the proxy_pass configuration
echo "Generated proxy_pass configuration:"
grep -A 2 -B 2 "proxy_pass" /etc/nginx/nginx.conf || echo "proxy_pass line not found"

# Validate nginx configuration
echo "Validating nginx configuration..."
if ! nginx -t; then
    echo "ERROR: Nginx configuration is invalid"
    echo "Generated config excerpt (upstream and location blocks):"
    grep -A 20 -B 5 "upstream\|location /api" /etc/nginx/nginx.conf
    exit 1
fi

echo "✅ Nginx configuration validated successfully"
echo "🚀 Starting nginx..."

# Start nginx with proper signal handling
exec dumb-init -- "$@"