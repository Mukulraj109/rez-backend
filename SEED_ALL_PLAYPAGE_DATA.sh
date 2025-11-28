#!/bin/bash
# ============================================================================
# Play Page Data Seeding Script
# Runs all seed scripts in the correct order to populate database
# ============================================================================

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     Play Page Production Data Seeding Script                  ║"
echo "║     Populates database with merchants, creators, videos,      ║"
echo "║     and articles for the Play page                            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Track success/failure
FAILED_SCRIPTS=()

# Function to run script and check result
run_script() {
    local script_name=$1
    local description=$2

    echo ""
    echo "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo "${YELLOW}📦 STEP: ${description}${NC}"
    echo "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""

    if [ -f "$script_name" ]; then
        node "$script_name"
        if [ $? -eq 0 ]; then
            echo ""
            echo "${GREEN}✅ SUCCESS: ${description}${NC}"
        else
            echo ""
            echo "${RED}❌ FAILED: ${description}${NC}"
            FAILED_SCRIPTS+=("$description")
        fi
    else
        echo "${RED}❌ ERROR: Script not found: $script_name${NC}"
        FAILED_SCRIPTS+=("$description (file not found)")
    fi

    sleep 2
}

# Start seeding
echo "${BLUE}Starting data seeding process...${NC}"
echo ""

# Step 1: Create Merchants
run_script "src/scripts/seed-merchants.js" "Create 15 Merchants"

# Step 2: Link Stores to Merchants
run_script "src/scripts/enhance-stores-with-merchants.js" "Link Stores to Merchants"

# Step 3: Create Content Creators
echo ""
echo "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo "${YELLOW}📦 STEP: Create 19 Content Creators${NC}"
echo "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

if [ -f "src/scripts/seed-user-creators.ts" ]; then
    npx ts-node src/scripts/seed-user-creators.ts
    if [ $? -eq 0 ]; then
        echo ""
        echo "${GREEN}✅ SUCCESS: Create 19 Content Creators${NC}"
    else
        echo ""
        echo "${RED}❌ FAILED: Create 19 Content Creators${NC}"
        FAILED_SCRIPTS+=("Create 19 Content Creators")
    fi
else
    echo "${RED}❌ ERROR: Script not found: src/scripts/seed-user-creators.ts${NC}"
    FAILED_SCRIPTS+=("Create 19 Content Creators (file not found)")
fi

sleep 2

# Step 4: Create Videos
run_script "src/scripts/seed-videos.js" "Create 125-175 Videos with Cloudinary"

# Step 5: Create Articles
run_script "src/scripts/seed-articles.js" "Create 20-30 Articles with Cloudinary"

# Final Summary
echo ""
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    SEEDING COMPLETE                            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

if [ ${#FAILED_SCRIPTS[@]} -eq 0 ]; then
    echo "${GREEN}✅ ALL SCRIPTS COMPLETED SUCCESSFULLY!${NC}"
    echo ""
    echo "${BLUE}Next steps:${NC}"
    echo "  1. Verify data with: node src/scripts/verify-seeded-videos.js"
    echo "  2. Start backend: npm run dev"
    echo "  3. Start frontend: cd ../frontend && npm start"
    echo ""
else
    echo "${RED}❌ SOME SCRIPTS FAILED:${NC}"
    for script in "${FAILED_SCRIPTS[@]}"; do
        echo "  - $script"
    done
    echo ""
    echo "${YELLOW}Please check the error messages above and fix before proceeding.${NC}"
    echo ""
fi

# Show verification command
echo ""
echo "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo "${YELLOW}📊 Verify Database:${NC}"
echo "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Run this command to verify all data:"
echo ""
echo "node -e \""
echo "const mongoose = require('mongoose');"
echo "mongoose.connect('mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/test')"
echo "  .then(() => Promise.all(["
echo "    mongoose.connection.db.collection('users').countDocuments({ role: 'merchant' }),"
echo "    mongoose.connection.db.collection('users').countDocuments({ role: 'user' }),"
echo "    mongoose.connection.db.collection('videos').countDocuments(),"
echo "    mongoose.connection.db.collection('articles').countDocuments()"
echo "  ]))"
echo "  .then(([merchants, users, videos, articles]) => {"
echo "    console.log('Merchants:', merchants, '(Target: 15)');"
echo "    console.log('Users:', users, '(Target: 37+)');"
echo "    console.log('Videos:', videos, '(Target: 125-175)');"
echo "    console.log('Articles:', articles, '(Target: 20-30)');"
echo "    mongoose.disconnect();"
echo "  });"
echo "\""

echo ""
echo "${GREEN}🎉 Database seeding complete!${NC}"
echo ""
