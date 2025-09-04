#!/bin/bash

# WIP Events App Deployment Script

echo "🚀 Starting deployment preparation..."

# Check if required environment variables are set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is not set. Please set it in your environment."
    exit 1
fi

if [ -z "$NEXTAUTH_SECRET" ]; then
    echo "❌ NEXTAUTH_SECRET is not set. Please set it in your environment."
    exit 1
fi

echo "✅ Environment variables check passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Generate Prisma client
echo "🗄️ Generating Prisma client..."
npm run db:generate

# Run database migrations (if using migrations instead of db push)
# echo "🔄 Running database migrations..."
# npm run db:migrate

# Push schema to database (for development/staging)
echo "📊 Pushing database schema..."
npm run db:push

# Seed database (only for initial setup)
if [ "$SEED_DATABASE" = "true" ]; then
    echo "🌱 Seeding database..."
    npm run db:seed
fi

# Build the application
echo "🏗️ Building application..."
npm run build

echo "✅ Deployment preparation complete!"
echo ""
echo "🎉 Your WIP Events app is ready to deploy!"
echo ""
echo "Next steps:"
echo "1. Set up your production database"
echo "2. Configure environment variables in your hosting platform"
echo "3. Deploy using your preferred method (Vercel, Railway, etc.)"

