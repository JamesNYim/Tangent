#!/bin/bash
set -e

WEBSITE_TERRAFORM="$(dirname "$0")/../Website/terraform"

BUCKET=$(cd "$WEBSITE_TERRAFORM" && terraform output -raw portfolio_bucket)
DIST_ID=$(cd "$WEBSITE_TERRAFORM" && terraform output -raw cloudfront_distribution_id)

echo "Building Tangent frontend..."
cd "$(dirname "$0")/frontend"
npm run build

echo "Syncing to s3://$BUCKET/Tangent/..."
aws s3 sync dist/ "s3://$BUCKET/Tangent/" --delete

echo "Invalidating CloudFront cache ($DIST_ID)..."
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/Tangent/*"

echo "Done. Tangent frontend is live at jamesnyim.com/Tangent/"
